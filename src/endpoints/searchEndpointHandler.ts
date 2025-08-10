import type { CollectionConfig, Payload, PayloadRequest, SelectType } from 'payload'

import { algoliasearch, type SearchResponse } from 'algoliasearch'
import { type ParsedQs } from 'qs-esm'

import type { PluginAlgoliaCredentials } from '../types.js'

type SelectFields = Record<string, SelectType>

/**
 * Fetches full documents from Payload to enrich the search results.
 * @returns A map of objectID -> full or partial Payload document.
 */
const getEnrichedDocsMap = async (
  payload: Payload,
  searchResult: SearchResponse,
  selectFields?: SelectFields,
): Promise<Record<string, Record<string, unknown>>> => {
  const { hits } = searchResult

  if (!hits || hits.length === 0) {
    return {}
  }

  // 1. Group hit IDs by their collection slug
  const hitsByCollection = hits.reduce<Record<string, string[]>>((acc, hit) => {
    const collectionSlug = hit.collection
    if (collectionSlug && typeof collectionSlug === 'string') {
      if (!acc[collectionSlug]) {
        acc[collectionSlug] = []
      }
      acc[collectionSlug].push(hit.objectID)
    }
    return acc
  }, {})

  // 2. Fetch full documents from Payload for each collection
  const enrichedDocsPromises = Object.entries(hitsByCollection).map(
    async ([collectionSlug, ids]) => {
      const result = await payload.find({
        collection: collectionSlug,
        depth: 1, // Default depth
        where: {
          id: {
            in: ids,
          },
        },
        limit: ids.length,
        select: selectFields?.[collectionSlug],
        overrideAccess: false, // Ensure access control is respected
      })
      return result.docs
    },
  )

  console.log(
    `Fetching ${hits.length} documents from Payload for search results... , \n ids = ${JSON.stringify(hits.map((hit) => hit.objectID))}`,
  )
  const allEnrichedDocs = (await Promise.all(enrichedDocsPromises)).flat()

  console.log(`Enriched ${allEnrichedDocs.length} documents from Payload for search results.`)
  // 3. Create a map for easy lookup
  return allEnrichedDocs.reduce<Record<string, Record<string, unknown>>>((acc, doc) => {
    acc[String(doc.id)] = doc

    return acc
  }, {})
}

/**
 * Processes the 'select' query parameter into a format suitable for Payload's `find` operation.
 * It expects a query structure like `select[collection][field]=true`.
 */
function processSelect(select: ParsedQs | string | string[] | undefined): SelectFields | undefined {
  if (typeof select !== 'object' || select === null) {
    return undefined
  }

  const processedSelect: SelectFields = {}

  for (const [collection, fields] of Object.entries(select)) {
    if (typeof fields === 'object' && fields !== null) {
      processedSelect[collection] = {}
      for (const [field, value] of Object.entries(fields)) {
        if (value === 'true') {
          processedSelect[collection][field] = true
        } else if (value === 'false') {
          processedSelect[collection][field] = false
        }
      }
    }
  }

  return processedSelect
}

export const createSearchEndpointHandler = (credentials: PluginAlgoliaCredentials) => {
  return async (req: PayloadRequest) => {
    try {
      const { query: searchQuery, enrichResults, select, ...searchParams } = req.query

      if (!searchQuery || typeof searchQuery !== 'string') {
        return Response.json(
          {
            error: 'Search query is required',
          },
          {
            status: 400,
          },
        )
      }

      if (!credentials.apiKey) {
        return Response.json(
          {
            error: 'Algolia search-only API key is not configured',
          },
          {
            status: 500,
          },
        )
      }

      const client = algoliasearch(credentials.appId, credentials.apiKey)

      const searchResult = await client.searchSingleIndex({
        indexName: credentials.indexName,
        searchParams: {
          ...(searchParams as Record<string, string>),
          query: searchQuery,
        },
      })

      let enrichedDocsMap: Record<string, unknown> | undefined

      if (enrichResults === 'true') {
        const selectFields = processSelect(select as ParsedQs)
        enrichedDocsMap = await getEnrichedDocsMap(req.payload, searchResult, selectFields)
      }

      return Response.json({
        ...searchResult,
        enrichedHits: enrichedDocsMap,
      })
    } catch (error) {
      req.payload.logger.error('Algolia search error:', error)
      return Response.json(
        {
          details: error instanceof Error ? error.message : 'Unknown error',
          error: 'Search failed',
        },
        {
          status: 500,
        },
      )
    }
  }
}

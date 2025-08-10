import type { Payload, PayloadRequest } from 'payload'

import { algoliasearch, type SearchResponse } from 'algoliasearch'

import type { PluginAlgoliaCredentials } from '../types.js'

/**
 * Fetches full documents from Payload to enrich the search results.
 * @returns A map of objectID -> full Payload document.
 */
const getEnrichedDocsMap = async (
  payload: Payload,
  searchResult: SearchResponse,
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
      })
      return result.docs
    },
  )

  const allEnrichedDocs = (await Promise.all(enrichedDocsPromises)).flat()

  // 3. Create a map for easy lookup on the frontend
  return allEnrichedDocs.reduce<Record<string, Record<string, unknown>>>((acc, doc) => {
    acc[String(doc.id)] = doc
    return acc
  }, {})
}

export const createSearchEndpointHandler = (credentials: PluginAlgoliaCredentials) => {
  return async (req: PayloadRequest) => {
    try {
      const { query: searchQuery, enrichResults, ...searchParams } = req.query

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

      // If enrichResults is requested, fetch full documents from Payload
      if (enrichResults === 'true') {
        enrichedDocsMap = await getEnrichedDocsMap(req.payload, searchResult)
      }

      return Response.json({
        ...searchResult,
        enrichedHits: enrichedDocsMap, // Return enriched docs in a separate field
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
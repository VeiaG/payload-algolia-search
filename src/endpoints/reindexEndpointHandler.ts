import type { CollectionConfig, PayloadRequest } from 'payload'

import { algoliasearch } from 'algoliasearch'

import type { FieldTransformer, PluginAlgoliaCredentials, ReindexAccessFunction } from '../types.js'

import { transformForAlgolia } from '../lib/transformers.js'

export const createReindexEndpointHandler = (
  credentials: PluginAlgoliaCredentials,
  indexFields: string[],
  fieldTransformers: Record<string, FieldTransformer>,
  collections: CollectionConfig[],
  accessFunction?: ReindexAccessFunction,
) => {
  return async (req: PayloadRequest) => {
    const { payload } = req

    if (accessFunction ? !accessFunction(req) : !req.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    try {
      const collectionSlug = req.routeParams?.collectionSlug as string

      if (!collectionSlug) {
        return new Response(JSON.stringify({ error: 'Collection slug is required' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const client = algoliasearch(credentials.appId, credentials.apiKey)
      const collection = collections.find((c) => c.slug === collectionSlug)

      if (!collection) {
        return new Response(
          JSON.stringify({
            error: `Collection '${collectionSlug}' not found in plugin configuration`,
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 404 },
        )
      }

      const pageSize = 500 // fetch in chunks
      let page = 1
      let totalIndexed = 0

      while (true) {
        const { docs, hasNextPage, totalDocs } = await payload.find({
          collection: collectionSlug,
          limit: pageSize,
          page,
        })

        if (!docs.length) {
          break
        }

        const objectsToIndex = docs.map((doc) => {
          const indexData = transformForAlgolia(doc, indexFields, collection, fieldTransformers)
          indexData.collection = collectionSlug
          return {
            objectID: doc.id, // stable ID for Algolia
            ...indexData,
          }
        })

        await sendWithRetry(client, credentials.indexName, objectsToIndex)

        totalIndexed += docs.length
        payload.logger.info(`Indexed ${totalIndexed}/${totalDocs} documents from ${collectionSlug}`)

        if (!hasNextPage) {
          break
        }
        page++
      }

      return new Response(
        JSON.stringify({
          indexed: totalIndexed,
          message: `Successfully indexed ${totalIndexed} documents from ${collectionSlug}`,
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      )
    } catch (error) {
      payload.logger.error(`Reindexing failed: ${String(error)}`)
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 },
      )
    }
  }
}

/**
 * Sends batch requests to Algolia, retrying on 429 with exponential backoff.
 * Uses partialUpdateObjectNoCreate so it only updates existing records.
 */
async function sendWithRetry(
  client: ReturnType<typeof algoliasearch>,
  indexName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  objects: any[],
  retries = 5,
) {
  let attempt = 0
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

  while (true) {
    try {
      await client.batch({
        batchWriteParams: {
          requests: objects.map((obj) => ({
            action: 'partialUpdateObject', // ✅ only update if exists
            body: obj,
          })),
        },
        indexName,
      })
      break // success
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.status === 429 && attempt < retries) {
        const wait = Math.min(1000 * 2 ** attempt, 15000) // exponential backoff up to 15s
        // eslint-disable-next-line no-console
        console.warn(
          `429 Rate limit hit. Retrying in ${wait}ms (attempt ${attempt + 1}/${retries})...`,
        )
        await delay(wait)
        attempt++
      } else {
        throw err
      }
    }
  }
}

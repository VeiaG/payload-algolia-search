import type { CollectionAfterChangeHook } from 'payload'

import { algoliasearch } from 'algoliasearch'

import type { FieldTransformer, PluginAlgoliaCredentials } from '../types.js'

import { transformForAlgolia } from '../lib/transformers.js'

export const createAfterChangeHook = (
  credentials: PluginAlgoliaCredentials,
  indexFields: string[],
  fieldTransformers: Record<string, FieldTransformer>,
): CollectionAfterChangeHook => {
  return async ({ collection, doc, req }) => {
    try {
      // Only index if document has an ID
      if (!doc.id) {
        req.payload.logger.warn(`Document missing ID, skipping Algolia indexing`)
        return doc
      }

      const client = algoliasearch(credentials.appId, credentials.apiKey)

      // Pick and transform the specified fields for indexing
      const indexData = transformForAlgolia(doc, indexFields, collection, fieldTransformers)

      // Add collection slug to the index data
      indexData.collection = collection.slug

      await client.addOrUpdateObject({
        body: indexData,
        indexName: credentials.indexName,
        objectID: doc.id,
      })

      req.payload.logger.info(`Document ${doc.id} indexed in Algolia`)
    } catch (error) {
      req.payload.logger.error(`Failed to index document ${doc.id} in Algolia: ${String(error)}`)
      // Don't throw error to prevent document save failure
    }

    return doc
  }
}

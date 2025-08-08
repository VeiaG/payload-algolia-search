import type { CollectionAfterDeleteHook } from 'payload'

import { algoliasearch } from 'algoliasearch'

import type { PluginAlgoliaCredentials } from '../types.js'

export const createAfterDeleteHook = (
  credentials: PluginAlgoliaCredentials,
): CollectionAfterDeleteHook => {
  return async ({ doc, req }) => {
    try {
      const client = algoliasearch(credentials.appId, credentials.apiKey)

      await client.deleteObject({
        indexName: credentials.indexName,
        objectID: doc.id,
      })

      req.payload.logger.info(`Document ${doc.id} removed from Algolia index`)
    } catch (error) {
      req.payload.logger.error(`Failed to remove document ${doc.id} from Algolia: ${String(error)}`)
    }
  }
}

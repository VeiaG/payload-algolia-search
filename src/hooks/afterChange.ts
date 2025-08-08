import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { algoliasearch } from 'algoliasearch'

import type { FieldTransformer, PluginAlgoliaCredentials, TransformedFieldValue } from '../types.js'

import { getFieldConfig } from '../lib/transformers.js'

// Enhanced pick function with transformers
const pick = (
  obj: any,
  fields: string[],
  collection: CollectionConfig,
  transformers: Record<string, FieldTransformer>,
): { [key: string]: TransformedFieldValue } => {
  const result: { [key: string]: TransformedFieldValue } = {}

  fields.forEach((field) => {
    const keys = field.split('.')
    let current = obj

    // Navigate to the nested value
    for (let i = 0; i < keys.length; i++) {
      if (current?.[keys[i]] === undefined) {
        return
      }
      current = current[keys[i]]
    }

    // Get field configuration
    const fieldConfig = getFieldConfig(collection, field)
    const fieldType = fieldConfig?.type

    // Apply transformer if available
    let transformedValue = current
    if (fieldType && transformers[fieldType]) {
      transformedValue = transformers[fieldType](current, fieldConfig)
    } else if (current !== null && current !== undefined) {
      // Default transformation for unhandled types
      transformedValue = typeof current === 'object' ? JSON.stringify(current) : String(current)
    }

    // Only include non-null values
    if (transformedValue !== null && transformedValue !== undefined) {
      result[field] = transformedValue
    }
  })

  return result
}

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
      const indexData = pick(doc, indexFields, collection, fieldTransformers)

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

// File: src/types.ts
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { CollectionSlug, Field } from 'payload'

/**
 * Credentials for connecting to Algolia.
 * Separates the admin key (for indexing) from the search key (for public queries).
 */
export type PluginAlgoliaCredentials = {
  /**
   * The Admin API Key with write permissions.
   * NEVER expose this on the client-side.
   */
  apiKey: string
  appId: string
  /**
   * Index name to use for all operations.
   */
  indexName: string
}

export type TransformedFieldValue = boolean | null | number | string | string[]

export type FieldTransformer<T = unknown> = (value: T, fieldConfig?: Field) => TransformedFieldValue

export type CollectionAlgoliaConfig = {
  indexFields: string[]
  slug: CollectionSlug
}

export type PluginAlgoliaSearchConfig = {
  /**
   * An array of collection slugs to apply the Algolia sync to.
   * Leave empty to apply to all collections.
   * @default []
   */
  collections: CollectionAlgoliaConfig[]
  /**
   * If true, the plugin will configure the Algolia index settings on initialization.
   * This does NOT sync existing documents.
   * @default true
   */
  configureIndexOnInit?: boolean
  /**
   * Your Algolia credentials.
   */
  credentials: PluginAlgoliaCredentials
  /**
   * If true, the plugin will be disabled.
   * @default false
   */
  disabled?: boolean
  /**
   * Custom field transformers by field type.
   * These will be merged with the default transformers.
   */
  fieldTransformers?: Record<string, FieldTransformer>
  /**
   * If true, the plugin will create a custom endpoint for search functionality.
   * Default endpoint is '/search', but can be customized.
   * If set to false, no endpoint will be created.
   * @default '/search'
   */
  searchEndpoint?: false | string
}

// Re-exporting for convenience in other files
export type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Config, Field } from 'payload'
export type { SerializedEditorState }

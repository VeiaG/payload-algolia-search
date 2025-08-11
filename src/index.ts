import type { Config } from 'payload'

import { algoliasearch } from 'algoliasearch'

import type { PluginAlgoliaSearchConfig } from './types.js'

import { createReindexEndpointHandler } from './endpoints/reindexEndpointHandler.js'
import { createSearchEndpointHandler } from './endpoints/searchEndpointHandler.js'
import { createAfterChangeHook } from './hooks/afterChange.js'
import { createAfterDeleteHook } from './hooks/afterDelete.js'
import { defaultFieldTransformers } from './lib/transformers.js'

export const algoliaSearchPlugin =
  (userPluginOptions: PluginAlgoliaSearchConfig) =>
  (config: Config): Config => {
    const pluginOptions: PluginAlgoliaSearchConfig = {
      configureIndexOnInit: true,
      disabled: false,
      overrideAccess: false,
      reindexEndpoint: '/reindex',
      searchEndpoint: '/search',
      ...userPluginOptions,
    }
    // Ensure the plugin is only applied if it is not disabled and has indexFields defined
    if (pluginOptions.disabled || !pluginOptions.collections) {
      return config
    }

    // Merge custom transformers with defaults
    const fieldTransformers = {
      ...defaultFieldTransformers,
      ...pluginOptions.fieldTransformers,
    }

    if (!config.collections) {
      config.collections = []
    }

    // Apply hooks to specific collection or all collections
    pluginOptions.collections.forEach((collectionOption) => {
      const collection = config.collections?.find((c) => c.slug === collectionOption.slug)

      if (!collection) {
        return
      }
      // Add hooks
      if (!collection.hooks) {
        collection.hooks = {}
      }
      if (!collection.hooks.afterChange) {
        collection.hooks.afterChange = []
      }
      if (!collection.hooks.afterDelete) {
        collection.hooks.afterDelete = []
      }
      if (!collection.admin) {
        collection.admin = {}
      }
      if (!collection.admin.components) {
        collection.admin.components = {}
      }
      if (!collection.admin.components.beforeList) {
        collection.admin.components.beforeList = []
      }

      if (pluginOptions.reindexEndpoint && !pluginOptions.hideReindexButton) {
        collection.admin.components.beforeList.push({
          clientProps: {
            reindexEndpoint: pluginOptions.reindexEndpoint,
          },
          path: '@veiag/payload-algolia-search/client#ReindexButton',
        })
      }

      // Use afterChange to ensure ID is available and pass transformers
      collection.hooks.afterChange.push(
        createAfterChangeHook(
          pluginOptions.credentials,
          collectionOption.indexFields,
          fieldTransformers,
        ),
      )

      collection.hooks.afterDelete.push(createAfterDeleteHook(pluginOptions.credentials))
    })

    if (!config.endpoints) {
      config.endpoints = []
    }

    // Add custom endpoint for search functionality
    if (pluginOptions.searchEndpoint) {
      config.endpoints.push({
        handler: createSearchEndpointHandler(
          pluginOptions.credentials,
          pluginOptions.overrideAccess,
        ),
        method: 'get',
        path: pluginOptions.searchEndpoint,
      })
    }

    // Add custom endpoint for reindex functionality
    if (pluginOptions.reindexEndpoint) {
      //get all collections configs , that are configured for indexing
      const collectionsSlugs = pluginOptions.collections.flatMap((c) => c.slug)
      const collectionsConfigs = config.collections?.filter((c) =>
        collectionsSlugs.includes(c.slug),
      )

      config.endpoints.push({
        handler: createReindexEndpointHandler(
          pluginOptions.credentials,
          pluginOptions.collections.flatMap((c) => c.indexFields),
          fieldTransformers,
          collectionsConfigs,
        ),
        method: 'post',
        path: `${pluginOptions.reindexEndpoint}/:collectionSlug`,
      })
    }

    if (!config.admin) {
      config.admin = {}
    }

    // Enhanced onInit function
    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      // Execute any existing onInit functions first
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }

      payload.logger.info('Algolia Search Plugin initialized')

      // Optionally sync existing data on initialization
      if (pluginOptions.configureIndexOnInit) {
        try {
          const client = algoliasearch(
            pluginOptions.credentials.appId,
            pluginOptions.credentials.apiKey,
          )
          const allIndexFields = pluginOptions.collections.flatMap(
            (collection) => collection.indexFields,
          )
          const uniqueIndexFields = [...new Set(allIndexFields)]

          // Create or update index settings
          await client.setSettings({
            indexName: pluginOptions.credentials.indexName,
            indexSettings: {
              attributesToHighlight: uniqueIndexFields,
              attributesToRetrieve: ['*'],
              searchableAttributes: uniqueIndexFields,
            },
          })

          payload.logger.info('Algolia index settings updated')
        } catch (error) {
          payload.logger.error('Failed to initialize Algolia index:', error)
        }
      }
    }

    return config
  }

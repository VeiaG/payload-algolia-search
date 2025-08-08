import type { PayloadRequest } from 'payload'

import { algoliasearch } from 'algoliasearch'

import type { PluginAlgoliaCredentials } from '../types.js'

export const createSearchEndpointHandler = (credentials: PluginAlgoliaCredentials) => {
  return async (req: PayloadRequest) => {
    try {
      const { query: searchQuery } = req.query

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
          query: searchQuery,
        },
      })

      return Response.json({
        currentPage: searchResult.page,
        hits: searchResult.hits,
        query: searchQuery,
        totalHits: searchResult.nbHits,
        totalPages: searchResult.nbPages,
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

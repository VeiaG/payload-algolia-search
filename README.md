# Payload Algolia Search Plugin

[![npm version](https://img.shields.io/npm/v/@veiag/payload-algolia-search.svg)](https://www.npmjs.com/package/@veiag/payload-algolia-search)

A powerful, feature-rich plugin to sync your [Payload CMS](https://payloadcms.com) collections with [Algolia](https://www.algolia.com/) to enable fast and extensive search capabilities.

---

## Features

-   **Automatic Syncing**: Automatically syncs documents to your Algolia index when they are created, updated, or deleted in Payload.
-   **Collection-Specific Configuration**: Configure which collections and which fields within those collections should be indexed.
-   **Re-indexing UI & Endpoint**: Includes a "Re-index" button in the admin panel for configured collections and a secure API endpoint to re-sync all documents on demand.
-   **Search Endpoint**: Provides a simple, secure endpoint to perform search queries directly against your Algolia index.
-   **Custom Field Transformers**: Provides hooks to transform complex field data (like Lexical Rich Text) into a searchable string format before indexing.
-   **Access Control**: Fine-grained control over who can trigger a re-index operation.
-   **Automatic Index Configuration**: Can be configured to set up Algolia index settings (like `searchableAttributes`) on server start-up.

## Installation

```bash
# pnpm
pnpm add @veiag/payload-algolia-search

# npm
npm install @veiag/payload-algolia-search

# yarn
yarn add @veiag/payload-algolia-search
```

## Quick Start

In your `payload.config.ts`, import the plugin and add it to the `plugins` array.

```ts
// payload.config.ts
import { buildConfig } from 'payload/config'
import { algoliaSearchPlugin } from '@veiag/payload-algolia-search'
import { MyCollection } from './collections/MyCollection'

export default buildConfig({
  // ... your base config
  collections: [MyCollection],
  plugins: [
    algoliaSearchPlugin({
      credentials: {
        appId: process.env.ALGOLIA_APP_ID,
        apiKey: process.env.ALGOLIA_API_KEY, // IMPORTANT: This is your ADMIN API Key
        indexName: process.env.ALGOLIA_INDEX_NAME,
      },
      collections: [
        {
          slug: 'my-collection', // Slug of the collection to sync
          indexFields: ['title', 'someOtherField'], // Fields to be indexed
        },
      ],
    }),
  ],
})
```

## Configuration

The plugin is configured by passing a `PluginAlgoliaSearchConfig` object.

| Option                 | Type                                       | Description                                                                                                                                                           | Default                  |
| ---------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `credentials`          | `PluginAlgoliaCredentials`                 | **Required.** Your Algolia App ID, Admin API Key, and the target Index Name. The Admin key is required for write operations and should be kept secret.                 | -                        |
| `collections`          | `CollectionAlgoliaConfig[]`                | **Required.** An array of objects defining which collections and fields to sync.                                                                                      | -                        |
| `searchEndpoint`       | `string \| false`                          | Path for the search endpoint. Set to `false` to disable.                                                                                                              | `'/search'`              |
| `reindexEndpoint`      | `string \| false`                          | Path for the re-indexing endpoint. Set to `false` to disable. The final path will be `/:reindexEndpoint/:collectionSlug`.                                              | `'/reindex'`             |
| `configureIndexOnInit` | `boolean`                                  | If `true`, the plugin will automatically configure your Algolia index settings (`searchableAttributes`, etc.) based on your `collections` config when Payload starts. | `true`                   |
| `hideReindexButton`    | `boolean`                                  | If `true`, the "Re-index" button will not be shown in the collection's list view in the admin panel. The endpoint remains active.                                      | `false`                  |
| `reindexAccess`        | `(req: PayloadRequest) => boolean`         | A function to control who has access to the re-index endpoint. By default, any logged-in user has access.                                                             | `({ req }) => !!req.user` |
| `fieldTransformers`    | `Record<string, FieldTransformer>`         | An object where keys are field types (e.g., `richText`, `relationship`) and values are functions to transform that field's data before indexing.                      | (uses default transformers) |
| `disabled`             | `boolean`                                  | A master switch to disable the plugin entirely.                                                                                                                       | `false`                  |

---

## Endpoints

### Search

The plugin creates a simple, secure proxy to Algolia's search API.

-   **Method**: `GET`
-   **Path**: `/search` (or your custom `searchEndpoint`)
-   **Query Params**:
    -   `query`: The search term.
    -   `enrichResults=true` (optional): If this parameter is set, the plugin will first get search results from Algolia and then use the resulting document IDs to fetch the full, up-to-date documents directly from Payload. This ensures that the data is always fresh and all access control rules are respected. However, it will be slower than a direct Algolia query.
    -   Any other valid Algolia search parameters can also be passed (e.g., `hitsPerPage`, `filters`).

**Example:**

```
GET /api/search?query=my-search-term&hitsPerPage=5
```

**Example with Result Enrichment:**

```
GET /api/search?query=my-search-term&enrichResults=true
```

### Result Enrichment

By default, the search endpoint returns the raw search results directly from Algolia. This is extremely fast, but the data in the search index might not be perfectly in sync with your database, and it bypasses Payload's access control.

By adding the `enrichResults=true` query parameter, you can tell the plugin to take the IDs from the Algolia search results and use them to fetch the complete documents from your Payload database.

The final response object will be the original Algolia search result, with an added `enrichedHits` field. This field will be a map (or dictionary) where the keys are the document IDs and the values are the full, fresh documents from Payload.

**Benefits of Enrichment:**

-   **Data Freshness:** The data in `enrichedHits` is guaranteed to be the latest version from your database.
-   **Security:** Payload's access control (both document and field-level) is fully respected for the documents in `enrichedHits`.
-   **Preserves Algolia Metadata:** The original `hits` array from Algolia, which contains valuable metadata like `_highlightResult` and `_snippetResult`, is completely untouched.

**Trade-offs:**

-   **Performance:** This option is inherently slower because it requires an additional database query after the Algolia search. Use it when data accuracy and security are more critical than raw speed.
-   **Frontend Implementation:** You will need to use the `enrichedHits` map on the client-side to access the full document data for each search result.

**Example Enriched Response Structure:**

```json
{
  "hits": [
    {
      "objectID": "60c7c5d5f1d2a5001f6b0e3d",
      "title": "My Awesome Post",
      "_highlightResult": { ... }
    }
  ],
  "enrichedHits": {
    "60c7c5d5f1d2a5001f6b0e3d": {
      "id": "60c7c5d5f1d2a5001f6b0e3d",
      "title": "My Awesome Post",
      "content": "...",
      "author": { ... }
    }
  },
  "page": 0,
  "nbHits": 1,
  ...
}
```

### Re-index a Collection

This endpoint allows you to re-sync all documents from a specific Payload collection to your Algolia index.

-   **Method**: `POST`
-   **Path**: `/reindex/:collectionSlug` (or your custom `reindexEndpoint`)
-   **Access Control**: Governed by the `reindexAccess` function.

This is the same endpoint triggered by the "Re-index" button in the admin UI.

## Custom Field Transformers

Some Payload fields store complex data structures (e.g., a `group` field) that aren't inherently searchable as a single text value. The Algolia Search Plugin uses "transformers" to convert this complex data into a simple `string`, `number`, `boolean`, or `string[]` that Algolia can effectively index.

The plugin comes with robust default transformers for most standard field types, including `richText`, `relationship`, and `upload`. You typically only need to write a custom transformer when you have a `group` or a custom field type with a structure that the plugin can't automatically flatten into a meaningful string.

A transformer is a function you define in the `fieldTransformers` object in the plugin configuration. The key is the `type` of the field (from your collection config), and the value is your transformer function.

### Transformer Function Signature

Your transformer function receives three arguments:

1.  `value` (`unknown`): The raw value of the field from the Payload document.
2.  `fieldConfig` (`Field`): The full configuration object for the field being transformed. This is useful for accessing properties you may have defined in your collection's field array.
3.  `collectionSlug` (`CollectionSlug`): The slug of the collection the document belongs to. This allows you to have different transformation logic for the same field type across different collections.

The function must return a `TransformedFieldValue`, which is one of: `string | number | boolean | string[] | null`.

### Example: Transforming a `group` field

A common use case is indexing a `group` field that contains multiple sub-fields. For example, a `post` collection might have an `authorDetails` group containing the author's name and title, and you want Algolia to be able to search both sub-fields as a single, combined text value.

Let's assume your `posts` collection has a `group` field named `authorDetails`:

```ts
// collections/Posts.ts
import { CollectionConfig } from 'payload/types'

export const Posts: CollectionConfig = {
  slug: 'posts',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    // ... other fields
    {
      name: 'authorDetails',
      type: 'group',
      fields: [
        {
          name: 'name',
          type: 'text',
        },
        {
          name: 'title',
          type: 'text',
        },
      ],
    },
  ],
}
```

To index the `authorDetails` field, you would first add `'authorDetails'` to your `indexFields` in the plugin config. Then, you would create a transformer for the `group` type.

```ts
// payload.config.ts
import { buildConfig } from 'payload/config'
import { algoliaSearchPlugin } from '@veiag/payload-algolia-search'

export default buildConfig({
  // ...
  plugins: [
    algoliaSearchPlugin({
      // ... credentials
      collections: [
        {
          slug: 'posts',
          indexFields: ['title', 'authorDetails'], // We want to index the 'authorDetails' group
        },
      ],
      fieldTransformers: {
        group: (value, fieldConfig) => {
          // Check if this is the 'authorDetails' group field
          if (fieldConfig.name === 'authorDetails' && value) {
            // Combine the sub-fields into a single searchable string
            const { name, title } = value
            return [name, title].filter(Boolean).join(' ')
          }
          
          // Return null for any other group fields you don't want to index
          return null
        },
      },
    }),
  ],
})
```

With this configuration, when a `post` is saved, the content of `authorDetails.name` and `authorDetails.title` will be combined and stored in the `authorDetails` attribute of your Algolia record, making it fully searchable.



## License

[MIT](./LICENSE)

# Payload Algolia Search Plugin

[![npm version](https://img.shields.io/npm/v/@veiag/payload-algolia-search.svg)](https://www.npmjs.com/package/@veiag/payload-algolia-search)

A powerful, feature-rich plugin to sync your [Payload CMS](https://payloadcms.com) collections with [Algolia](https://www.algolia.com/) to enable fast and extensive search capabilities.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [Plugin Options](#plugin-options)
  - [Collection Configuration](#collection-configuration)
  - [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Search Endpoint](#search-endpoint)
  - [Re-index Endpoint](#re-index-endpoint)
- [Advanced Features](#advanced-features)
  - [Result Enrichment](#result-enrichment)
  - [Field Selection](#field-selection)
  - [Custom Field Transformers](#custom-field-transformers)
  - [Access Control](#access-control)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

The Payload Algolia Search Plugin bridges your Payload CMS with Algolia's powerful search infrastructure, providing:

- **🔄 Automatic Syncing**: Real-time synchronization of your Payload collections with Algolia
- **⚡ Fast Search**: Lightning-fast search capabilities powered by Algolia
- **🎯 Flexible Configuration**: Granular control over which collections and fields to index
- **🔒 Secure**: Built-in access control and secure API endpoints
- **🛠️ Developer-Friendly**: Comprehensive customization options and hooks

### Key Features

- **Automatic Syncing**: Documents are automatically synced when created, updated, or deleted
- **Collection-Specific Configuration**: Choose exactly which collections and fields to index
- **Admin UI Integration**: Built-in re-index button in the Payload admin panel
- **RESTful Endpoints**: Dedicated endpoints for search and re-indexing operations
- **Result Enrichment**: Option to fetch fresh, access-controlled data from Payload
- **Custom Transformers**: Transform complex field types for optimal search indexing
- **Access Control**: Fine-grained permissions for re-indexing operations
- **Auto-Configuration**: Automatic Algolia index setup on server start

## Installation

Install the plugin using your preferred package manager:

```bash
# pnpm (recommended)
pnpm add @veiag/payload-algolia-search

# npm
npm install @veiag/payload-algolia-search

# yarn
yarn add @veiag/payload-algolia-search
```

## Quick Start

### 1. Basic Setup

Add the plugin to your `payload.config.ts`:

```typescript
import { buildConfig } from 'payload/config'
import { algoliaSearchPlugin } from '@veiag/payload-algolia-search'

export default buildConfig({
  // ... your existing config
  plugins: [
    algoliaSearchPlugin({
      credentials: {
        appId: process.env.ALGOLIA_APP_ID!,
        apiKey: process.env.ALGOLIA_API_KEY!, // Admin API Key
        indexName: process.env.ALGOLIA_INDEX_NAME!,
      },
      collections: [
        {
          slug: 'posts',
          indexFields: ['title', 'content', 'tags'],
        },
      ],
    }),
  ],
})
```

### 2. Environment Variables

Create a `.env` file with your Algolia credentials:

```bash
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_admin_api_key
ALGOLIA_INDEX_NAME=your_index_name
```

### 3. Start Your Server

The plugin will automatically:
- Configure your Algolia index (if it exists)
- Set up search and re-index endpoints

To index existing documents, use re-index endpoints (or button in admin UI)

## Configuration

### Plugin Options

The plugin accepts a configuration object with the following options:

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `credentials` | `PluginAlgoliaCredentials` | ✅ | - | Algolia connection details |
| `collections` | `CollectionAlgoliaConfig[]` | ✅ | - | Collections to sync with Algolia |
| `searchEndpoint` | `string \| false` | ❌ | `'/search'` | Search endpoint path (set to `false` to disable) |
| `reindexEndpoint` | `string \| false` | ❌ | `'/reindex'` | Re-index endpoint path (set to `false` to disable) |
| `configureIndexOnInit` | `boolean` | ❌ | `true` | Auto-configure Algolia index on startup |
| `hideReindexButton` | `boolean` | ❌ | `false` | Hide re-index button in admin UI |
| `reindexAccess` | `function` | ❌ | `( req ) => !!req.user` | Access control for re-index operations |
| `fieldTransformers` | `Record<string, FieldTransformer>` | ❌ | - | Custom field transformation functions |
| `disabled` | `boolean` | ❌ | `false` | Disable the plugin entirely |

### Collection Configuration

Each collection in the `collections` array supports:

```typescript
interface CollectionAlgoliaConfig {
  slug: string;           // Collection slug
  indexFields: string[];  // Fields to index in Algolia
}
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ALGOLIA_APP_ID` | Your Algolia Application ID | ✅ |
| `ALGOLIA_API_KEY` | Your Algolia Admin API Key | ✅ |
| `ALGOLIA_INDEX_NAME` | Target Algolia index name | ✅ |

> ⚠️ **Security Note**: The `ALGOLIA_API_KEY` should be your Admin API Key and must be kept secret. Never expose it in client-side code.

## API Reference

### Search Endpoint

Perform search queries against your Algolia index.

**Endpoint**: `GET /search` (or your configured `searchEndpoint`)

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | Search term |
| `enrichResults` | `boolean` | Fetch fresh documents from Payload |
| `select` | `object` | Field selection for enriched results |
| `hitsPerPage` | `number` | Number of results per page |
| `filters` | `string` | Algolia filters |
| *Any other Algolia search parameter* | *varies* | Passed directly to Algolia |

#### Basic Search Example

```javascript
// Simple search
const response = await fetch('/search?query=javascript&hitsPerPage=10');
const results = await response.json();
```

### Re-index Endpoint

Manually trigger a full re-index of a collection.

**Endpoint**: `POST /reindex/:collectionSlug`

#### Example

```javascript
// Re-index the 'posts' collection
const response = await fetch('/reindex/posts', { method: 'POST' });
const result = await response.json();
```

## Advanced Features

### Result Enrichment

By default, search results come directly from Algolia for maximum speed. However, you can enable result enrichment to get fresh, access-controlled data from your Payload database.

#### Why Use Enrichment?

- **Data Freshness**: Guaranteed up-to-date information from your database
- **Security**: Respects Payload's access control rules
- **Metadata Preservation**: Keeps Algolia's search metadata (highlights, snippets)

#### How It Works

Add `enrichResults=true` to your search query:

```javascript
const response = await fetch('/search?query=javascript&enrichResults=true');
const { hits, enrichedHits, ...algoliaMetadata } = await response.json();

// hits: Original Algolia results with search metadata
// enrichedHits: Fresh documents from Payload (keyed by ID)
```

#### Response Structure

```json
{
  "hits": [
    {
      "objectID": "60c7c5d5f1d2a5001f6b0e3d",
      "title": "JavaScript Basics",
      "_highlightResult": { "title": { "value": "<em>JavaScript</em> Basics" } }
    }
  ],
  "enrichedHits": {
    "60c7c5d5f1d2a5001f6b0e3d": {
      "id": "60c7c5d5f1d2a5001f6b0e3d",
      "title": "JavaScript Basics",
      "content": "Full article content...",
      "author": { "name": "John Doe" },
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  },
  "nbHits": 1,
  "page": 0
}
```

### Field Selection

Control which fields are returned in enriched results to optimize response size and performance.

#### Using Field Selection

```javascript
import qs from 'qs-esm';

// Include only specific fields
const selectFields = {
  posts: { title: true, slug: true },
  authors: { name: true, email: true }
};

const params = {
  query: 'javascript',
  enrichResults: true,
  select: selectFields
};

const url = `/search?${qs.stringify(params)}`;
```

#### Selection Strategies

**Inclusion (recommended)**:
```javascript
{
  posts: { title: true, content: true },
  authors: { name: true }
}
```

**Exclusion**:
```javascript
{
  posts: { internalNotes: false, draft: false }
}
```

### Custom Field Transformers

Transform complex field types into searchable formats before indexing in Algolia.

#### When to Use Transformers

- **Group Fields**: Flatten nested data structures
- **Custom Fields**: Handle proprietary field types
- **Complex Data**: Convert objects/arrays to searchable strings

#### Transformer Function Signature

```typescript
type FieldTransformer = (
  value: unknown,
  fieldConfig: Field,
  collectionSlug: string
) => string | number | boolean | string[] | null;
```

#### Example: Group Field Transformer

```typescript
// Collection with group field
const Posts: CollectionConfig = {
  slug: 'posts',
  fields: [
    {
      name: 'authorDetails',
      type: 'group',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'title', type: 'text' },
        { name: 'bio', type: 'textarea' },
      ],
    },
  ],
};

// Plugin configuration
algoliaSearchPlugin({
  // ... other config
  collections: [
    {
      slug: 'posts',
      indexFields: ['title', 'authorDetails'], // Include the group field
    },
  ],
  fieldTransformers: {
    group: (value, fieldConfig, collectionSlug) => {
      if (fieldConfig.name === 'authorDetails' && value) {
        const { name, title, bio } = value as any;
        return [name, title, bio].filter(Boolean).join(' ');
      }
      return null; // Don't index other group fields
    },
  },
});
```

#### Built-in Transformers

The plugin includes default transformers for:
- `text`: Just return the value as-is, or in case of an array, join the elements with a comma
- `richText`: Converts rich text to plain text
- `relationship`: Extracts related document titles or names (returns `value.title`, `value.name`, `value.slug`, or `String(value.id)`)
- `upload`: Indexes file names and metadata (uses `value?.filename`, `value?.alt`, `value?.title`, or `null`)
- `select`: Handles select field values
- `array`: Joins array elements into a comma-separated string; if elements are objects, their values are concatenated into a single string before joining.

### Access Control

Control who can trigger re-indexing operations.

#### Default Access Control

By default, any authenticated user can trigger re-indexing:

```typescript
const defaultAccess = ( req: PayloadRequest ) => !!req.user;
```

#### Custom Access Control

Restrict access to specific user roles:

```typescript
algoliaSearchPlugin({
  // ... other config
  reindexAccess: ( req ) => {
    return req.user?.role === 'admin' || req.user?.role === 'editor';
  },
});
```

#### Disable Re-indexing UI

Hide the re-index button while keeping the endpoint active:

```typescript
algoliaSearchPlugin({
  // ... other config
  hideReindexButton: true,
});
```

## Examples

### Basic Blog Setup

```typescript
import { algoliaSearchPlugin } from '@veiag/payload-algolia-search';

export default buildConfig({
  collections: [Posts, Authors, Categories],
  plugins: [
    algoliaSearchPlugin({
      credentials: {
        appId: process.env.ALGOLIA_APP_ID!,
        apiKey: process.env.ALGOLIA_API_KEY!,
        indexName: process.env.ALGOLIA_INDEX_NAME!,
      },
      collections: [
        {
          slug: 'posts',
          indexFields: ['title', 'excerpt', 'content', 'tags'],
        },
        {
          slug: 'authors',
          indexFields: ['name', 'bio'],
        },
      ],
    }),
  ],
});
```

### E-commerce Setup

```typescript
algoliaSearchPlugin({
  credentials: {
    appId: process.env.ALGOLIA_APP_ID!,
    apiKey: process.env.ALGOLIA_API_KEY!,
    indexName: process.env.ALGOLIA_INDEX_NAME!,
  },
  collections: [
    {
      slug: 'products',
      indexFields: ['title', 'description', 'category', 'brand', 'sku','specifications'],
    },
  ],
  fieldTransformers: {
    group: (value, fieldConfig) => {
      if (fieldConfig.name === 'specifications' && value) {
        return Object.entries(value)
          .map(([key, val]) => `${key}: ${val}`)
          .join(' ');
      }
      return null;
    },
  },
});
```

### Frontend Search Implementation

```javascript
// React search component example
const SearchResults = ({ query }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchProducts = async () => {
      if (!query) return;
      
      setLoading(true);
      try {
        const response = await fetch(
          `/search?query=${encodeURIComponent(query)}&enrichResults=true&hitsPerPage=20`
        );
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    searchProducts();
  }, [query]);

  if (loading) return <div>Searching...</div>;
  if (!results) return null;

  return (
    <div>
      <p>{results.nbHits} results found</p>
      {results.hits.map((hit) => {
        const enrichedData = results.enrichedHits[hit.objectID];
        return (
          <div key={hit.objectID}>
            <h3 dangerouslySetInnerHTML={{ 
              __html: hit._highlightResult.title.value 
            }} />
            {enrichedData && (
              <p>{enrichedData.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

## Troubleshooting

### Common Issues

#### Plugin Not Syncing Documents

**Symptoms**: Documents aren't appearing in Algolia after creation/updates.

**Solutions**:
1. Verify your Algolia credentials are correct
2. Check that `indexFields` includes existing fields
3. Ensure the API key has write permissions
4. Check server logs for error messages

#### Search Endpoint Returns 404

**Symptoms**: Search requests fail with 404 errors.

**Solutions**:
1. Verify `searchEndpoint` is not set to `false`
2. Check your server is running and the plugin is loaded
3. Ensure the endpoint path doesn't conflict with existing routes

#### Re-index Button Not Appearing

**Symptoms**: No re-index button in the admin panel.

**Solutions**:
1. Check that `hideReindexButton` is not set to `true`
2. Ensure the collection is configured in the plugin

#### Enriched Results Empty

**Symptoms**: `enrichedHits` is empty even with `enrichResults=true`.

**Solutions**:
1. Verify documents exist in your Payload database
2. Check access control permissions for the requesting user
3. Ensure document IDs in Algolia match Payload document IDs

#### Localized Content Issues

**Current Limitation**: This plugin does not currently support Payload's localization features. Localized fields will not be indexed correctly.

**Workarounds**:
1. **Single Locale**: Configure your collections to use only one locale for now
2. **Manual Field Mapping**: Create separate non-localized fields specifically for search indexing


### Performance Optimization

#### Large Collections

For collections with many documents:
1. Use field selection to limit response size
2. Implement pagination with `hitsPerPage`
3. Consider indexing only essential fields initially

#### Search Performance

- Use enrichment sparingly for better performance
- Cache search results on the frontend when appropriate
- Consider using Algolia's faceting for filters instead of enrichment

## License

[MIT](./LICENSE)

---

## Contributing

We welcome contributions!

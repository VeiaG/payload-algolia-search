// client.tsx - Client-side dashboard component
'use client'
import React, { useState } from 'react'

export const BeforeDashboardClient: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/algolia-search?query=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e1e5e9',
        borderRadius: '4px',
        marginBottom: '2rem',
        padding: '1rem',
      }}
    >
      <h3>Algolia Search</h3>
      <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your content..."
            style={{
              border: '1px solid #ccc',
              borderRadius: '4px',
              flex: 1,
              padding: '0.5rem',
            }}
            type="text"
            value={searchQuery}
          />
          <button
            disabled={isLoading}
            style={{
              backgroundColor: '#0070f3',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              padding: '0.5rem 1rem',
            }}
            type="submit"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {searchResults && (
        <div>
          <p>Found {searchResults.totalHits} results</p>
          {searchResults.hits?.map((hit: any, index: number) => (
            <div
              key={hit.objectID || index}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                margin: '0.5rem 0',
                padding: '0.5rem',
              }}
            >
              <strong>Collection: {hit.collection}</strong>
              <br />
              <small>ID: {hit.objectID}</small>
              {/* Display other indexed fields */}
              <div style={{ marginTop: '0.5rem' }}>
                {Object.entries(hit)
                  .filter(([key]) => !['collection', 'objectID'].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <strong>{key}:</strong> {String(value)}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

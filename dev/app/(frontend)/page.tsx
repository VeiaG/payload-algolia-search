'use client'
import React, { useState } from 'react'

const Page = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query) {
      setError('Please enter a search query.')
      return
    }
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&hitsPerPage=5`)
      const data = await res.json()
      if (res.ok) {
        setResults(data)
      } else {
        setError(data.error || 'An error occurred')
      }
    } catch (err) {
      setError('An error occurred while fetching search results.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Algolia Search Test</h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your search query"
          style={{ padding: '0.5rem', width: '300px' }}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {results && (
        <div>
          <h2>Search Results</h2>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default Page
'use client'
import React, { useState } from 'react'

const Page = () => {
  const [query, setQuery] = useState('')
  const [enrich, setEnrich] = useState(false)
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
      const params = new URLSearchParams({
        query,
        hitsPerPage: '5',
      })

      if (enrich) {
        params.append('enrichResults', 'true')
      }

      const res = await fetch(`/api/search?${params.toString()}`)
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
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Algolia Search Test</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
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
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} />
          Enrich Results
        </label>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {results && (
        <div>
          <h2>Search Results</h2>
          <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px' }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default Page

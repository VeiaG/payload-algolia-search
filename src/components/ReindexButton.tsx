'use client'
import { Button } from '@payloadcms/ui'
import React, { useState } from 'react'

export const ReindexButton: React.FC<{ collectionSlug: string }> = ({ collectionSlug }) => {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<null | string>(null)

  const handleClick = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/algolia/reindex/${collectionSlug}`, {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        setStatus(`Indexed ${data.indexed} documents`)
      } else {
        setStatus(`Error: ${data.error}`)
      }
    } catch (err) {
      setStatus(`Error: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <Button disabled={loading} onClick={handleClick}>
        {loading ? 'Indexing...' : 'Index all to Algolia'}
      </Button>
      {status && <p>{status}</p>}
    </div>
  )
}

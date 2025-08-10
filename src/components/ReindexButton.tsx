'use client'
import { Button } from '@payloadcms/ui'
import React, { useState } from 'react'

export const ReindexButton: React.FC<{ collectionSlug: string; reindexEndpoint?: string }> = ({
  collectionSlug,
  reindexEndpoint = '/reindex',
}) => {
  const [loading, setLoading] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [status, setStatus] = useState<null | string>(null)

  const handleClick = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/${reindexEndpoint}/${collectionSlug}`, {
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
    <div
      className="gutter--left gutter--right "
      style={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'row',
        gap: '2rem',
        justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Button buttonStyle="secondary" disabled={loading} onClick={handleClick}>
          {loading ? 'Indexing...' : `Index all ${collectionSlug}`}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Oops!</h2>
      <p style={{ color: '#A3A3A3', marginBottom: '24px' }}>Something went wrong while loading this page.</p>
      <button
        onClick={() => reset()}
        className="btn btn-primary"
      >
        Try again
      </button>
    </div>
  )
}

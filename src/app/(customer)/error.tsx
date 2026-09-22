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
    <div className="customer-state-page">
      <div className="customer-state-card customer-error-card">
        <div className="customer-state-icon">⚠️</div>
        <h2>We couldn&apos;t load this page</h2>
        <p>Check your connection and try again.</p>
        <button
          onClick={() => reset()}
          className="btn btn-primary"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

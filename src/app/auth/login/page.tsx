import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Sign In — RestPilot',
  description: 'Sign in to your RestPilot restaurant dashboard.',
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="customer-state-page">
        <div className="customer-spinner" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <LoginClient />
    </Suspense>
  )
}

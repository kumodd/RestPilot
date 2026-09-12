import type { Metadata } from 'next'
import { Suspense } from 'react'
import UpdatePasswordClient from './UpdatePasswordClient'

export const metadata: Metadata = {
  title: 'Update Password — RestPilot',
  description: 'Update your RestPilot password.',
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0F0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <UpdatePasswordClient />
    </Suspense>
  )
}

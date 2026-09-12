import type { Metadata } from 'next'
import { Suspense } from 'react'
import ResetPasswordClient from './ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password — RestPilot',
  description: 'Reset your RestPilot password.',
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0F0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  )
}

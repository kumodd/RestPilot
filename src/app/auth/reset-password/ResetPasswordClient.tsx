'use client'

import Link from 'next/link'

export default function ResetPasswordClient() {
  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <h1 style={headingStyle}>Password reset unavailable</h1>
        <p style={textStyle}>RestPilot uses email verification codes only. Request a new one-time code to sign in.</p>
        <Link href="/auth/login" style={buttonStyle}>Back to sign in</Link>
      </section>
    </main>
  )
}

const pageStyle: React.CSSProperties = { minHeight: '100vh', background: '#F7F7F8', display: 'grid', placeItems: 'center', padding: '24px' }
const cardStyle: React.CSSProperties = { width: '100%', maxWidth: '420px', background: '#FFFFFF', border: '1px solid rgba(23,23,23,0.08)', borderRadius: '20px', padding: '32px', textAlign: 'center', boxShadow: '0 16px 48px rgba(23,23,23,0.10)' }
const headingStyle: React.CSSProperties = { color: '#171717', fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px' }
const textStyle: React.CSSProperties = { color: '#737373', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }
const buttonStyle: React.CSSProperties = { display: 'inline-block', padding: '13px 20px', background: '#FF6B35', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 700 }

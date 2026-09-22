'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Props {
  token: string
  inviteData: any
  errorMsg: string | null
}

export default function AcceptInviteClient({ token, inviteData, errorMsg }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [supabase.auth])

  const handleAccept = async () => {
    setIsLoading(true)
    setMessage(null)

    // Call the RPC to accept invitation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.rpc('accept_invitation' as any, { p_token: token } as any)

    if (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to accept invitation' })
      setIsLoading(false)
    } else {
      setMessage({ type: 'success', text: 'Invitation accepted! Redirecting to dashboard...' })
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    }
  }

  if (errorMsg) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Invalid Invitation</h1>
          <p style={{ color: '#FCA5A5', marginBottom: '20px', textAlign: 'center' }}>{errorMsg}</p>
          <div style={{ textAlign: 'center' }}>
            <Link href="/auth/login" style={linkStyle}>Go to Login</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={titleStyle}>You've been invited!</h1>
          <p style={{ color: '#737373', fontSize: '0.9rem' }}>
            You have been invited to join <strong>{inviteData?.restaurants?.name}</strong> as a <strong>{inviteData?.role}</strong>.
          </p>
        </div>

        {user ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#A3A3A3', fontSize: '0.85rem', marginBottom: '20px' }}>
              You are signed in as <strong>{user.email}</strong>.
            </p>
            <button onClick={handleAccept} disabled={isLoading} style={buttonStyle(isLoading)}>
              {isLoading ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <p style={{ marginTop: '16px', fontSize: '0.8rem' }}>
               Not you? <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: '#FF6B35', cursor: 'pointer', textDecoration: 'underline' }}>Sign out</button>
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#A3A3A3', fontSize: '0.85rem', marginBottom: '20px' }}>
              Sign in with the invited email and its one-time code to accept this invitation.
            </p>
            <Link href={`/auth/login?redirect=/auth/accept-invite?token=${token}`} style={{ ...buttonStyle(false), display: 'inline-block', textDecoration: 'none' }}>
              Sign In with Email OTP
            </Link>
          </div>
        )}

        {message && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: '10px',
            fontSize: '0.85rem',
            color: message.type === 'success' ? '#86EFAC' : '#FCA5A5',
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0F0F1A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  background: '#1A1A2E',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '32px',
  boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
}

const titleStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 800,
  color: '#F5F5F5',
  marginBottom: '8px',
  textAlign: 'center'
}

const linkStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#A3A3A3',
  textDecoration: 'none',
  transition: 'color 0.2s',
}

const buttonStyle = (isLoading: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '13px',
  background: isLoading ? 'rgba(255,107,53,0.5)' : '#FF6B35',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '0.95rem',
  fontWeight: 700,
  cursor: isLoading ? 'not-allowed' : 'pointer',
  transition: 'all 0.25s ease',
  boxShadow: isLoading ? 'none' : '0 8px 24px rgba(255,107,53,0.3)',
})

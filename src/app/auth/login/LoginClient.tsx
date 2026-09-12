'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AuthMode = 'magic_link' | 'password'

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/dashboard'
  const errorParam = searchParams.get('error')

  const [mode, setMode] = useState<AuthMode>('magic_link')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hashError, setHashError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const desc = hashParams.get('error_description')
      if (desc) {
        setHashError(desc.replace(/\+/g, ' '))
        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
  }, [])

  const supabase = createClient()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setMessage(null)
    setHashError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({
        type: 'success',
        text: 'Check your email! We sent you a magic link to sign in.',
      })
    }
    setIsLoading(false)
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setIsLoading(true)
    setMessage(null)
    setHashError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setIsLoading(false)
    } else {
      router.push(redirect)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0F0F1A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '300px',
          background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #FF6B35, #E5562B)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              🍽️
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F5F5F5', letterSpacing: '-0.02em' }}>
              RestPilot
            </span>
          </div>
          <p style={{ color: '#737373', fontSize: '0.88rem' }}>Staff & Owner Portal</p>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#1A1A2E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '6px' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#737373', marginBottom: '28px' }}>
            Sign in to your restaurant dashboard
          </p>

          {/* Error from URL params or hash */}
          {(errorParam || hashError) && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                color: '#FCA5A5',
              }}
            >
              {errorParam === 'account_inactive' && 'Your account has been deactivated. Please contact your restaurant manager.'}
              {errorParam === 'auth_callback_failed' && (searchParams.get('details') || 'Authentication failed. Please try again.')}
              {errorParam === 'missing_code' && !hashError && 'Invalid or missing authentication link.'}
              {hashError && hashError}
            </div>
          )}

          {/* Mode Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              padding: '3px',
              marginBottom: '24px',
            }}
          >
            {(['magic_link', 'password'] as AuthMode[]).map(m => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setMessage(null)
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: mode === m ? '#FF6B35' : 'transparent',
                  color: mode === m ? 'white' : '#737373',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {m === 'magic_link' ? '✉️ Magic Link' : '🔑 Password'}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'magic_link' ? handleMagicLink : handlePassword}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#A3A3A3', display: 'block', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#F5F5F5',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#FF6B35' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>

              {mode === 'password' && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#A3A3A3', display: 'block', marginBottom: '6px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#F5F5F5',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#FF6B35' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                  <div style={{ textAlign: 'right', marginTop: '8px' }}>
                    <a
                      href={`/auth/reset-password?redirect=${encodeURIComponent(redirect)}`}
                      style={{
                        fontSize: '0.8rem',
                        color: '#A3A3A3',
                        textDecoration: 'none',
                        transition: 'color 0.2s',
                      }}
                      onMouseOver={e => (e.currentTarget.style.color = '#FF6B35')}
                      onMouseOut={e => (e.currentTarget.style.color = '#A3A3A3')}
                    >
                      Forgot password?
                    </a>
                  </div>
                </div>
              )}

              {/* Feedback */}
              {message && (
                <div
                  style={{
                    padding: '12px',
                    background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    color: message.type === 'success' ? '#86EFAC' : '#FCA5A5',
                  }}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: isLoading ? 'rgba(255,107,53,0.5)' : '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isLoading ? 'none' : '0 8px 24px rgba(255,107,53,0.3)',
                  transition: 'all 0.25s ease',
                  marginTop: '4px',
                }}
              >
                {isLoading ? (
                  <>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    {mode === 'magic_link' ? 'Sending...' : 'Signing in...'}
                  </>
                ) : (
                  mode === 'magic_link' ? 'Send Magic Link' : 'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.78rem', color: '#525252' }}>
          Customer ordering? Scan the QR code at your table.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

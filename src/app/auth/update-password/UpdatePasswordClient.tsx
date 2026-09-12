'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordClient() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setIsLoading(false)
    } else {
      setMessage({
        type: 'success',
        text: 'Password updated successfully. Redirecting...',
      })
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
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
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F5F5F5', marginBottom: '8px' }}>
            Set New Password
          </h1>
          <p style={{ color: '#737373', fontSize: '0.88rem' }}>
            Enter your new password below.
          </p>
        </div>

        <div
          style={{
            background: '#1A1A2E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          <form onSubmit={handleUpdatePassword}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#A3A3A3', display: 'block', marginBottom: '6px' }}>
                  New Password
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
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#FF6B35' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#A3A3A3', display: 'block', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
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
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#FF6B35' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>

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
                disabled={isLoading || message?.type === 'success'}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: (isLoading || message?.type === 'success') ? 'rgba(255,107,53,0.5)' : '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: (isLoading || message?.type === 'success') ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: (isLoading || message?.type === 'success') ? 'none' : '0 8px 24px rgba(255,107,53,0.3)',
                  transition: 'all 0.25s ease',
                  marginTop: '4px',
                }}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

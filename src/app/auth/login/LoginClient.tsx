'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Feedback = { type: 'success' | 'error'; text: string }

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedRedirect = searchParams.get('redirect')
  const redirect = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') ? requestedRedirect : '/dashboard'
  const errorParam = searchParams.get('error')
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<Feedback | null>(null)

  const sendOtp = async (event: React.SyntheticEvent) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return
    setIsLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setEmail(normalizedEmail)
      setOtpSent(true)
      setMessage({ type: 'success', text: 'We sent a 6-digit code to your email.' })
    }
    setIsLoading(false)
  }

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedOtp = otp.trim()
    if (!normalizedEmail || !/^\d{6}$/.test(normalizedOtp)) {
      setMessage({ type: 'error', text: 'Enter the 6-digit code from your email.' })
      return
    }
    setIsLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.verifyOtp({ email: normalizedEmail, token: normalizedOtp, type: 'email' })
    if (error) {
      setMessage({ type: 'error', text: error.message })
      setIsLoading(false)
      return
    }
    router.replace(redirect)
  }

  const displayedError = errorParam === 'account_inactive'
    ? 'Your account has been deactivated. Please contact your restaurant manager.'
    : errorParam === 'auth_callback_failed'
      ? searchParams.get('details') || 'Authentication failed. Please request a new code.'
      : errorParam === 'missing_code'
        ? 'Authentication links are disabled. Request a new email code.'
        : errorParam === 'otp_required'
          ? 'Use the 6-digit email code to sign in.'
        : null

  return (
    <div style={pageStyle}>
      <div style={glowStyle} />
      <div style={contentStyle}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={logoRowStyle}><div style={logoStyle}>🍽️</div><span style={brandStyle}>RestPilot</span></div>
          <p style={mutedStyle}>Staff & Owner Portal</p>
        </div>
        <div style={cardStyle}>
          <h1 style={headingStyle}>Welcome back</h1>
          <p style={{ ...mutedStyle, marginBottom: '28px' }}>Sign in securely with your email and a one-time code.</p>
          {(displayedError || message) && <div style={feedbackStyle((message?.type ?? 'error') === 'success' && !displayedError)}>{displayedError || message?.text}</div>}
          {otpSent ? (
            <form onSubmit={verifyOtp}>
              <label htmlFor="otp" style={labelStyle}>6-Digit Email Code</label>
              <input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" required autoFocus style={inputStyle} />
              <button type="submit" disabled={isLoading} style={buttonStyle(isLoading)}>{isLoading ? 'Verifying…' : 'Verify & Sign In'}</button>
              <div style={actionsStyle}>
                <button type="button" style={secondaryButtonStyle} onClick={() => { setOtp(''); setMessage(null); setOtpSent(false) }}>Use a different email</button>
                <button type="button" style={secondaryButtonStyle} onClick={sendOtp} disabled={isLoading}>Resend code</button>
              </div>
            </form>
          ) : (
            <form onSubmit={sendOtp}>
              <label htmlFor="email" style={labelStyle}>Email Address</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@restaurant.com" required autoFocus style={inputStyle} />
              <button type="submit" disabled={isLoading} style={buttonStyle(isLoading)}>{isLoading ? 'Sending…' : 'Send Email Code'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = { minHeight: '100vh', background: '#0F0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }
const glowStyle: React.CSSProperties = { position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.08) 0%, transparent 70%)', pointerEvents: 'none' }
const contentStyle: React.CSSProperties = { width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }
const logoRowStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }
const logoStyle: React.CSSProperties = { width: '40px', height: '40px', background: 'linear-gradient(135deg, #FF6B35, #E5562B)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }
const brandStyle: React.CSSProperties = { fontSize: '1.4rem', fontWeight: 800, color: '#F5F5F5', letterSpacing: '-0.02em' }
const mutedStyle: React.CSSProperties = { color: '#737373', fontSize: '0.88rem' }
const cardStyle: React.CSSProperties = { background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }
const headingStyle: React.CSSProperties = { fontSize: '1.3rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '6px' }
const labelStyle: React.CSSProperties = { fontSize: '0.82rem', fontWeight: 600, color: '#A3A3A3', display: 'block', marginBottom: '6px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', marginBottom: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#F5F5F5', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', letterSpacing: '0.08em' }
const buttonStyle = (isLoading: boolean): React.CSSProperties => ({ width: '100%', padding: '13px', background: isLoading ? 'rgba(255,107,53,0.5)' : '#FF6B35', color: 'white', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.25s ease', boxShadow: isLoading ? 'none' : '0 8px 24px rgba(255,107,53,0.3)' })
const secondaryButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#A3A3A3', cursor: 'pointer', fontSize: '0.8rem', padding: '8px 0' }
const actionsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '10px' }
const feedbackStyle = (success: boolean): React.CSSProperties => ({ padding: '12px', background: success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${success ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '10px', marginBottom: '20px', fontSize: '0.85rem', color: success ? '#86EFAC' : '#FCA5A5' })

import Link from 'next/link'

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 40%, #0F0F1A 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background:
            'radial-gradient(ellipse at center, rgba(255,107,53,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ textAlign: 'center', maxWidth: '640px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '48px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              background: 'linear-gradient(135deg, #FF6B35, #E5562B)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              boxShadow: '0 8px 24px rgba(255,107,53,0.4)',
            }}
          >
            🍽️
          </div>
          <span
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#F5F5F5',
              letterSpacing: '-0.02em',
            }}
          >
            RestPilot
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 800,
            color: '#F5F5F5',
            lineHeight: 1.15,
            marginBottom: '20px',
            letterSpacing: '-0.03em',
          }}
        >
          Digital ordering,
          <br />
          <span style={{ color: '#FF6B35' }}>human service.</span>
        </h1>

        <p
          style={{
            fontSize: '1.1rem',
            color: '#A3A3A3',
            lineHeight: 1.7,
            marginBottom: '48px',
            maxWidth: '480px',
            margin: '0 auto 48px',
          }}
        >
          Customers scan a QR code to browse and order. Waiters verify, recommend, and confirm.
          Kitchen receives clean structured orders. Everyone wins.
        </p>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '64px',
          }}
        >
          <Link
            href="/auth/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: '#FF6B35',
              color: 'white',
              borderRadius: '14px',
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(255,107,53,0.35)',
              transition: 'all 0.25s ease',
            }}
          >
            Get Started →
          </Link>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: 'rgba(255,255,255,0.06)',
              color: '#F5F5F5',
              borderRadius: '14px',
              fontWeight: 600,
              fontSize: '1rem',
              border: '1px solid rgba(255,255,255,0.1)',
              textDecoration: 'none',
            }}
          >
            Dashboard
          </Link>
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {[
            '📱 QR Ordering',
            '🧑‍🍳 Waiter Verified',
            '⚡ Real-time Updates',
            '🏪 Multi-Restaurant',
            '🔒 Secure RLS',
          ].map(feature => (
            <span
              key={feature}
              style={{
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '999px',
                fontSize: '0.82rem',
                color: '#A3A3A3',
                fontWeight: 500,
              }}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Flow diagram */}
      <div
        style={{
          marginTop: '80px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          opacity: 0.7,
        }}
      >
        {['SCAN', '→', 'BROWSE', '→', 'ORDER', '→', 'WAITER VERIFIES', '→', 'KITCHEN', '→', 'SERVED'].map(
          (step, i) => (
            <span
              key={i}
              style={{
                fontSize: step === '→' ? '0.9rem' : '0.78rem',
                fontWeight: step === '→' ? 400 : 700,
                color: step === '→' ? '#525252' : '#FF6B35',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {step}
            </span>
          )
        )}
      </div>
    </main>
  )
}

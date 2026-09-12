import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RestPilot — QR Restaurant Ordering & Operations Platform',
  description: 'Customers scan, browse, order and track. Waiter reviews, confirms. Kitchen gets clean tickets. You get real-time control. One platform for the complete restaurant ordering workflow.',
}

/* ─── Reusable tiny components ──────────────────────────────── */

function FlowStep({ step, label, sub }: { step: string; label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '90px' }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.2rem',
      }}>{step}</div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F5F5F5', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
      {sub && <span style={{ fontSize: '0.65rem', color: '#525252', textAlign: 'center' }}>{sub}</span>}
    </div>
  )
}

function Arrow() {
  return <span style={{ color: '#FF6B35', fontSize: '1.1rem', opacity: 0.5, flexShrink: 0 }}>↓</span>
}

function ArrowR() {
  return <span style={{ color: '#FF6B35', fontSize: '1.1rem', opacity: 0.5, flexShrink: 0 }}>→</span>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <div style={{ width: '3px', height: '16px', background: '#FF6B35', borderRadius: '999px' }} />
      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FF6B35', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{children}</span>
    </div>
  )
}

function StatusBadge({ label, color, icon }: { label: string; color: string; icon: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 16px', borderRadius: '10px',
      background: `${color}10`, border: `1px solid ${color}30`,
    }}>
      <span style={{ fontSize: '0.9rem' }}>{icon}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#E5E5E5' }}>{label}</span>
    </div>
  )
}

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0A0A12',
      color: '#F5F5F5',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflowX: 'hidden',
    }}>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px',
        background: 'rgba(10,10,18,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #FF6B35, #E5562B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(255,107,53,0.35)',
          }}>🍽️</div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>RestPilot</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/auth/login" style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', color: '#A3A3A3', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 }}>Sign In</Link>
          <Link href="/auth/login" style={{ padding: '9px 20px', borderRadius: '10px', background: '#FF6B35', color: 'white', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,107,53,0.35)' }}>Get Started</Link>
        </div>
      </nav>

      {/* ── SECTION 1: HERO ────────────────────────────────── */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: 'clamp(64px, 10vw, 120px) 24px clamp(80px, 12vw, 140px)',
        textAlign: 'center',
      }}>
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(255,107,53,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', marginBottom: '28px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6B35', display: 'inline-block' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FF9A75', letterSpacing: '0.04em' }}>QR ORDERING + RESTAURANT OPERATIONS PLATFORM</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: '24px' }}>
            Digital ordering,{' '}
            <span style={{ background: 'linear-gradient(135deg, #FF6B35, #FF9A75)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              human service.
            </span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#A3A3A3', lineHeight: 1.8, maxWidth: '560px', margin: '0 auto 40px' }}>
            Customers scan a QR code, browse your menu, and order. Your waiters verify, your kitchen cooks, and you see everything in real-time.
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '56px' }}>
            <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 32px', background: 'linear-gradient(135deg, #FF6B35, #E5562B)', color: 'white', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 28px rgba(255,107,53,0.4)' }}>
              Get Started Free →
            </Link>
            <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 28px', background: 'rgba(255,255,255,0.05)', color: '#E5E5E5', borderRadius: '14px', fontWeight: 600, fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' }}>
              View Dashboard
            </Link>
          </div>

          {/* Core flow strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', opacity: 0.8 }}>
            {['📱 Scan QR', '→', '🍽️ Browse Menu', '→', '🛒 Order', '→', '🛎️ Waiter Verifies', '→', '👨‍🍳 Kitchen', '→', '✅ Served'].map((s, i) => (
              <span key={i} style={{
                fontSize: s === '→' ? '0.9rem' : '0.75rem', fontWeight: s === '→' ? 300 : 700,
                color: s === '→' ? '#444' : '#FF9A75',
                letterSpacing: s === '→' ? 0 : '0.05em',
              }}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: THE PROBLEM ─────────────────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <SectionLabel>The Problem</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px' }}>
            The manual ordering experience hasn't changed.
          </h2>
          <p style={{ color: '#737373', fontSize: '1rem', lineHeight: 1.8, maxWidth: '540px', marginBottom: '48px' }}>
            Most restaurants still rely entirely on paper menus, verbal orders, and staff coordination by memory. Every step is a potential friction point.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {[
              { icon: '⏳', title: 'Waiting to order', desc: 'Customers sit, look around, and wait. Staff rush between tables.' },
              { icon: '📢', title: 'Manual communication', desc: 'Orders passed verbally from waiter to kitchen — prone to misunderstanding.' },
              { icon: '🤷', title: 'No order visibility', desc: 'Once ordered, customers have no idea what's happening to their food.' },
              { icon: '🔄', title: 'Coordination overhead', desc: 'Waiters spend time relaying kitchen status instead of serving.' },
            ].map(item => (
              <div key={item.title} style={{ padding: '20px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '6px' }}>{item.title}</h3>
                <p style={{ fontSize: '0.82rem', color: '#737373', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: CUSTOMER FLOW ───────────────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <SectionLabel>Customer Experience</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '12px' }}>
            From QR scan to order — in under a minute.
          </h2>
          <p style={{ color: '#737373', fontSize: '1rem', lineHeight: 1.8, marginBottom: '48px', maxWidth: '520px' }}>
            No app download. No customer account. Just scan and order.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            {[
              { icon: '📷', step: '01', label: 'Scan QR Code', desc: 'Phone camera, no app' },
              { icon: '🏠', step: '02', label: 'Restaurant Page', desc: 'Branded landing' },
              { icon: '📖', step: '03', label: 'Browse Menu', desc: 'Categories & items' },
              { icon: '✏️', step: '04', label: 'Customise', desc: 'Variants & add-ons' },
              { icon: '🛒', step: '05', label: 'Add to Cart', desc: 'Special instructions' },
              { icon: '👤', step: '06', label: 'Your Name', desc: 'Optional / required' },
              { icon: '✅', step: '07', label: 'Place Order', desc: 'Review & confirm' },
              { icon: '📡', step: '08', label: 'Live Tracking', desc: 'Real-time status' },
            ].map(item => (
              <div key={item.step} style={{ position: 'relative', padding: '18px 14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.6rem', fontWeight: 800, color: '#FF6B35', opacity: 0.5 }}>{item.step}</div>
                <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{item.icon}</div>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '3px' }}>{item.label}</p>
                <p style={{ fontSize: '0.68rem', color: '#525252' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: ORDER TRACKING STATUS ──────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <SectionLabel>Live Order Tracking</SectionLabel>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px' }}>
              Customers see exactly what's happening.
            </h2>
            <p style={{ color: '#737373', lineHeight: 1.8, fontSize: '0.95rem' }}>
              After placing an order, customers are shown a live tracking screen. Every step of the restaurant workflow is reflected in real-time — no need to ask a waiter for an update.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Order Placed', color: '#6B7280', icon: '📋', done: true },
              { label: 'Waiter Reviewing', color: '#F59E0B', icon: '👀', done: true },
              { label: 'Confirmed — Going to Kitchen', color: '#3B82F6', icon: '✅', done: true },
              { label: 'Being Prepared', color: '#8B5CF6', icon: '👨‍🍳', done: false },
              { label: 'Ready to Serve', color: '#22C55E', icon: '🔔', done: false },
              { label: 'Served — Enjoy!', color: '#FF6B35', icon: '🍽️', done: false },
            ].map(s => (
              <StatusBadge key={s.label} label={s.label} color={s.color} icon={s.icon} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: RESTAURANT OPERATIONS ──────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <SectionLabel>Restaurant Operations</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '12px' }}>
            From order placed to order served — fully connected.
          </h2>
          <p style={{ color: '#737373', fontSize: '1rem', lineHeight: 1.8, maxWidth: '520px', marginBottom: '48px' }}>
            Inside your restaurant, every role sees exactly what they need — in real-time.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxWidth: '680px', margin: '0 auto' }}>
            {[
              { icon: '📱', label: 'Customer places order', role: 'Customer', color: '#6B7280' },
              { icon: '📊', label: 'Order appears in Waiter Dashboard', role: 'Waiter', color: '#3B82F6' },
              { icon: '👀', label: 'Waiter reviews the order', role: 'Waiter', color: '#3B82F6' },
              { icon: '✅', label: 'Waiter confirms — sends to kitchen', role: 'Waiter', color: '#3B82F6' },
              { icon: '🖥️', label: 'Kitchen receives KDS ticket', role: 'Kitchen', color: '#FF6B35' },
              { icon: '👨‍🍳', label: 'Kitchen accepts → cooks → marks ready', role: 'Kitchen', color: '#FF6B35' },
              { icon: '🔔', label: 'Waiter notified — order ready', role: 'Waiter', color: '#3B82F6' },
              { icon: '🍽️', label: 'Waiter serves customer', role: 'Waiter', color: '#3B82F6' },
              { icon: '📈', label: 'Order recorded in owner dashboard', role: 'Owner', color: '#8B5CF6' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderLeft: `3px solid ${step.color}30` }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${step.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{step.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F5F5F5' }}>{step.label}</p>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: '999px', background: `${step.color}18`, color: step.color, border: `1px solid ${step.color}30`, flexShrink: 0 }}>{step.role}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: THE THREE ROLES ────────────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <SectionLabel>Team Structure</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '12px' }}>
            One platform. Every role. Zero confusion.
          </h2>
          <p style={{ color: '#737373', fontSize: '1rem', lineHeight: 1.8, maxWidth: '520px', marginBottom: '48px' }}>
            RestPilot is built for every person in your restaurant — from owner to kitchen hand.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {[
              { role: 'Owner', icon: '👑', color: '#F59E0B', resp: 'Restaurant & business management. Full platform access.', perms: ['Dashboard', 'All Settings', 'Staff', 'Reports', 'Billing'] },
              { role: 'Manager', icon: '👔', color: '#8B5CF6', resp: 'Day-to-day operations. Menu, staff and settings.', perms: ['Orders', 'Menu', 'Staff', 'Settings', 'Reports'] },
              { role: 'Waiter', icon: '🛎️', color: '#3B82F6', resp: 'Receive, confirm and serve customer orders.', perms: ['View Orders', 'Confirm', 'Tables', 'Serve'] },
              { role: 'Chef', icon: '👨‍🍳', color: '#FF6B35', resp: 'Kitchen display, accept and mark orders ready.', perms: ['Kitchen Display', 'Mark Ready', 'Item Status'] },
              { role: 'Cashier', icon: '💵', color: '#22C55E', resp: 'View orders and access reports for billing.', perms: ['View Orders', 'Reports'] },
            ].map(item => (
              <div key={item.role} style={{ padding: '20px', background: 'rgba(255,255,255,0.025)', border: `1px solid ${item.color}25`, borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{item.icon}</div>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: item.color }}>{item.role}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#737373', lineHeight: 1.6, marginBottom: '12px' }}>{item.resp}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {item.perms.map(p => (
                    <span key={p} style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: '999px', background: `${item.color}12`, color: item.color, border: `1px solid ${item.color}25` }}>{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: MENU MANAGEMENT ───────────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          <div>
            <SectionLabel>Menu Control</SectionLabel>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px' }}>
              Build and publish your menu — instantly.
            </h2>
            <p style={{ color: '#737373', lineHeight: 1.8, marginBottom: '28px', fontSize: '0.95rem' }}>
              Create categories, add items with full configuration, and toggle availability in real-time. Changes are live the moment you save.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '🏷️', label: 'Name, description & price' },
                { icon: '🌿', label: 'Dietary labels — Veg, Vegan, Non-Veg, Gluten-Free' },
                { icon: '🌶️', label: 'Spice level indicators' },
                { icon: '⭐', label: 'Popular, New, Special tags' },
                { icon: '📐', label: 'Variants — sizes with price differences' },
                { icon: '➕', label: 'Add-ons — extras with individual prices' },
                { icon: '⚡', label: 'Instant availability toggle per item or category' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1rem', width: '24px', textAlign: 'center' }}>{f.icon}</span>
                  <span style={{ fontSize: '0.84rem', color: '#A3A3A3' }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🍽️ Menu Editor</span>
                <span style={{ fontSize: '0.7rem', color: '#22C55E', background: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: '999px', border: '1px solid rgba(34,197,94,0.2)' }}>Live</span>
              </div>
              {[
                { cat: 'Starters', items: 4, active: true },
                { cat: 'Mains', items: 8, active: true },
                { cat: 'Desserts', items: 3, active: false },
                { cat: 'Beverages', items: 6, active: true },
              ].map(c => (
                <div key={c.cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.82rem', color: c.active ? '#F5F5F5' : '#525252' }}>{c.cat}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#737373' }}>{c.items} items</span>
                    <div style={{ width: '28px', height: '16px', borderRadius: '999px', background: c.active ? '#22C55E' : '#374151', position: 'relative', cursor: 'pointer' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: c.active ? '14px' : '2px', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 8: TABLES + QR ────────────────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          {/* Mock table grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { n: 'T1', status: 'Active', color: '#FF6B35' },
              { n: 'T2', status: 'Available', color: '#22C55E' },
              { n: 'T3', status: 'Available', color: '#22C55E' },
              { n: 'T4', status: 'Active', color: '#FF6B35' },
              { n: 'T5', status: 'Available', color: '#22C55E' },
              { n: 'T6', status: 'Active', color: '#F59E0B' },
            ].map(t => (
              <div key={t.n} style={{ padding: '14px 10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${t.color}30`, borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#F5F5F5', marginBottom: '4px' }}>{t.n}</div>
                <div style={{ fontSize: '0.62rem', color: t.color, fontWeight: 700 }}>{t.status}</div>
                <div style={{ marginTop: '8px', fontSize: '1.2rem' }}>▥</div>
              </div>
            ))}
          </div>
          <div>
            <SectionLabel>Tables & QR Codes</SectionLabel>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px' }}>
              One QR code per table. Always.
            </h2>
            <p style={{ color: '#737373', lineHeight: 1.8, marginBottom: '28px', fontSize: '0.95rem' }}>
              Add your tables, generate unique QR codes for each, and download them for printing. When a customer scans, they're taken directly to your restaurant's menu.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Add table with number and capacity',
                'One unique QR code per table',
                'Download and print immediately',
                'Customer scans → directly to your menu',
                'Table status visible in real-time',
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.55rem', color: '#FF6B35' }}>✓</span>
                  </div>
                  <span style={{ fontSize: '0.84rem', color: '#A3A3A3' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: KITCHEN DISPLAY ─────────────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          <div>
            <SectionLabel>Kitchen Display System</SectionLabel>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px' }}>
              Your kitchen, structured.
            </h2>
            <p style={{ color: '#737373', lineHeight: 1.8, marginBottom: '28px', fontSize: '0.95rem' }}>
              Confirmed orders appear instantly on your kitchen display. Chefs see order number, items, age, and current status — and advance tickets with a single tap.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { label: 'NEW', color: '#8B5CF6' },
                { label: 'ACCEPTED', color: '#3B82F6' },
                { label: 'COOKING', color: '#FF6B35' },
                { label: 'READY', color: '#22C55E' },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '5px 12px', borderRadius: '999px', background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}30` }}>{s.label}</span>
                  {i < arr.length - 1 && <ArrowR />}
                </div>
              ))}
            </div>
          </div>
          {/* KDS ticket mock */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '16px', padding: '20px', boxShadow: '0 0 0 2px rgba(255,107,53,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🟣 New Order</span>
                <p style={{ fontSize: '2rem', fontWeight: 900, color: '#F5F5F5', lineHeight: 1, marginTop: '4px' }}>#42</p>
                <p style={{ fontSize: '0.72rem', color: '#737373' }}>Table 5 · 2 items</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 700 }}>⏱ 3m</span>
              </div>
            </div>
            {[
              { name: 'Butter Chicken', note: 'Less spicy' },
              { name: 'Garlic Naan × 2', note: '' },
            ].map(item => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ fontSize: '0.84rem', fontWeight: 600, color: '#F5F5F5' }}>{item.name}</p>
                  {item.note && <p style={{ fontSize: '0.7rem', color: '#737373' }}>📝 {item.note}</p>}
                </div>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid #525252', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }} />
              </div>
            ))}
            <button style={{ marginTop: '14px', width: '100%', padding: '10px', background: 'rgba(139,92,246,0.15)', border: '1.5px solid rgba(139,92,246,0.4)', borderRadius: '10px', color: '#A78BFA', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer' }}>
              Accept Order →
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 10: OWNER DASHBOARD ───────────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <SectionLabel>Owner Dashboard</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '12px' }}>
            Your restaurant. Real-time. One screen.
          </h2>
          <p style={{ color: '#737373', fontSize: '1rem', lineHeight: 1.8, maxWidth: '520px', marginBottom: '48px' }}>
            Every order, every rupee, every table — visible the moment it happens.
          </p>

          {/* Mock stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
            {[
              { label: "Today's Orders", value: '38', icon: '📋', color: '#3B82F6' },
              { label: "Today's Revenue", value: '₹14,280', icon: '💰', color: '#22C55E' },
              { label: 'Active Tables', value: '6 / 12', icon: '🪑', color: '#FF6B35' },
              { label: 'Avg Order Value', value: '₹376', icon: '📊', color: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}20`, borderRadius: '14px' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: '8px' }}>{s.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, letterSpacing: '-0.02em', marginBottom: '4px' }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#737373' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Live Orders', icon: '📊', color: '#3B82F6' },
              { label: 'Menu Editor', icon: '🍽️', color: '#FF6B35' },
              { label: 'Tables & QR', icon: '🪑', color: '#8B5CF6' },
              { label: 'Staff', icon: '👥', color: '#22C55E' },
              { label: 'Reports', icon: '📈', color: '#F59E0B' },
              { label: 'Settings', icon: '⚙️', color: '#6B7280' },
            ].map(item => (
              <div key={item.label} style={{ padding: '14px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', textAlign: 'center', cursor: 'default' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{item.icon}</div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#A3A3A3' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 11: SETTINGS ──────────────────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          <div>
            <SectionLabel>Restaurant Settings</SectionLabel>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px' }}>
              Configure the workflow your restaurant needs.
            </h2>
            <p style={{ color: '#737373', lineHeight: 1.8, fontSize: '0.95rem' }}>
              RestPilot doesn't force one workflow on every restaurant. Toggle waiter verification, add tax, enable service charges, and choose what customer information you collect.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { group: 'Order Workflow', items: ['Waiter Verification Required', 'Customers Can Add Items', 'Auto-Accept Kitchen Orders'] },
              { group: 'Tax & Charges', items: ['GST / Tax %', 'Service Charge %'] },
              { group: 'Customer Fields', items: ['Require Customer Name', 'Require Phone Number'] },
              { group: 'Notifications', items: ['Waiter Sound Alerts', 'Kitchen Sound Alerts'] },
            ].map(group => (
              <div key={group.group} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FF6B35', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group.group}</p>
                {group.items.map(item => (
                  <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#A3A3A3' }}>{item}</span>
                    <div style={{ width: '28px', height: '16px', borderRadius: '999px', background: '#22C55E', position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', right: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 12: STAFF + PERMISSIONS ──────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <SectionLabel>Staff Management</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '12px' }}>
            Add your team. Control what they can do.
          </h2>
          <p style={{ color: '#737373', fontSize: '1rem', lineHeight: 1.8, maxWidth: '520px', marginBottom: '40px' }}>
            Invite staff by email, assign a role, and set granular permissions per person. Change permissions any time without restarting anything.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {[
              { group: '📋 Orders', perms: ['View', 'Confirm', 'Cancel', 'Add Items'] },
              { group: '🍽️ Menu', perms: ['View', 'Edit', 'Toggle Availability'] },
              { group: '🪑 Tables', perms: ['View', 'Manage', 'Generate QR'] },
              { group: '👥 Staff', perms: ['View', 'Manage', 'Invite'] },
              { group: '📊 Reports', perms: ['View', 'Export'] },
              { group: '👨‍🍳 Kitchen', perms: ['KDS Access', 'Mark Ready'] },
            ].map(group => (
              <div key={group.group} style={{ padding: '16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '10px' }}>{group.group}</p>
                {group.perms.map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '4px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.5rem', color: '#A78BFA' }}>✓</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#737373' }}>{p}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 13: FOMO ──────────────────────────────── */}
      <section style={{ padding: 'clamp(64px,10vw,120px) 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <SectionLabel>Why Now</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.15, marginBottom: '24px' }}>
            Customers already use their phones for everything.
          </h2>
          <p style={{ color: '#A3A3A3', fontSize: '1.05rem', lineHeight: 1.9, marginBottom: '24px' }}>
            They already use their phones to navigate, pay, and communicate. Ordering food at a restaurant table is the one experience that still requires flagging down a waiter.
          </p>
          <p style={{ color: '#A3A3A3', fontSize: '1.05rem', lineHeight: 1.9, marginBottom: '24px' }}>
            Restaurant teams can now connect ordering, waiter verification, and kitchen operations in a single structured workflow — instead of managing each step manually.
          </p>
          <p style={{ color: '#F5F5F5', fontSize: '1.05rem', lineHeight: 1.9, fontWeight: 600 }}>
            The question for your restaurant is:<br />
            <span style={{ color: '#FF9A75' }}>Why should your ordering experience still depend entirely on memory and verbal communication?</span>
          </p>
        </div>
      </section>

      {/* ── SECTION 14: WHAT YOU GET ───────────────────────── */}
      <section style={{ padding: 'clamp(48px,8vw,96px) 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <SectionLabel>After Signup</SectionLabel>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '12px' }}>
            Everything ready from day one.
          </h2>
          <p style={{ color: '#737373', fontSize: '1rem', lineHeight: 1.8, maxWidth: '520px', marginBottom: '48px' }}>
            After onboarding, your restaurant is fully configured and live. No technical setup. No waiting.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {[
              { icon: '🏪', label: 'Restaurant Profile', desc: 'Name, contact, branding, currency' },
              { icon: '🍽️', label: 'Menu System', desc: 'Categories, items, variants, add-ons' },
              { icon: '🪑', label: 'Tables & QR Codes', desc: 'Unique QR per table, ready to print' },
              { icon: '👥', label: 'Staff Access', desc: 'Roles, permissions, and magic-link invite' },
              { icon: '⚙️', label: 'Order Workflow', desc: 'Configured for your operation' },
              { icon: '👨‍🍳', label: 'Kitchen Workflow', desc: 'KDS ready — new → cooking → ready' },
              { icon: '📱', label: 'Customer Ordering', desc: 'QR scan, browse, order, track' },
              { icon: '📊', label: 'Owner Dashboard', desc: 'Orders, revenue, tables, reports' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <p style={{ fontSize: '0.84rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '3px' }}>{item.label}</p>
                  <p style={{ fontSize: '0.72rem', color: '#737373', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 15: FINAL CTA ─────────────────────────── */}
      <section style={{ padding: 'clamp(80px,12vw,140px) 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '700px', height: '400px', background: 'radial-gradient(ellipse, rgba(255,107,53,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', marginBottom: '28px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6B35', display: 'inline-block' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FF9A75', letterSpacing: '0.04em' }}>START YOUR RESTAURANT ONBOARDING</span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '20px' }}>
            Set up your restaurant.<br />
            <span style={{ background: 'linear-gradient(135deg, #FF6B35, #FF9A75)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Go live today.
            </span>
          </h2>

          <p style={{ color: '#737373', fontSize: '1rem', lineHeight: 1.8, marginBottom: '40px', maxWidth: '480px', margin: '0 auto 40px' }}>
            Owner details, restaurant information, menu, tables, QR codes, and staff — fully guided onboarding from start to live.
          </p>

          {/* Onboarding steps */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '40px', opacity: 0.75 }}>
            {['Owner Info', '→', 'Restaurant', '→', 'Menu', '→', 'Tables & QR', '→', 'Staff', '→', '🚀 Live'].map((s, i) => (
              <span key={i} style={{ fontSize: s === '→' ? '0.8rem' : '0.75rem', fontWeight: s === '→' ? 300 : 700, color: s === '→' ? '#444' : '#FF9A75', letterSpacing: s === '→' ? 0 : '0.03em' }}>{s}</span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 36px', background: 'linear-gradient(135deg, #FF6B35, #E5562B)', color: 'white', borderRadius: '14px', fontWeight: 800, fontSize: '1.05rem', textDecoration: 'none', boxShadow: '0 12px 32px rgba(255,107,53,0.45)', letterSpacing: '-0.01em' }}>
              Get Started Free →
            </Link>
            <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 28px', background: 'rgba(255,255,255,0.05)', color: '#E5E5E5', borderRadius: '14px', fontWeight: 600, fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #FF6B35, #E5562B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🍽️</div>
          <span style={{ fontWeight: 800, color: '#F5F5F5', fontSize: '0.9rem' }}>RestPilot</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#525252' }}>QR Restaurant Ordering &amp; Operations Platform</p>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link href="/auth/login" style={{ fontSize: '0.78rem', color: '#525252', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/auth/login" style={{ fontSize: '0.78rem', color: '#FF9A75', textDecoration: 'none', fontWeight: 600 }}>Get Started →</Link>
        </div>
      </footer>
    </main>
  )
}

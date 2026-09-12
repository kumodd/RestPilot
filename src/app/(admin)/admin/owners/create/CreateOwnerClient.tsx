'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PLANS = [
  { value: 'free',     label: 'Free',     desc: '1 restaurant, basic features' },
  { value: 'standard', label: 'Standard', desc: 'Up to 3 restaurants, full features' },
  { value: 'premium',  label: 'Premium',  desc: 'Unlimited restaurants, priority support' },
]

interface Step1 { ownerName: string; ownerEmail: string; ownerPhone: string; businessName: string; plan: string; maxRestaurants: string }
interface Step2 { restaurantName: string; restaurantSlug: string; city: string; phone: string; email: string; currency: string; currencySymbol: string }
type Phase = 'owner' | 'restaurant' | 'done'

interface Result { ownerId: string; profileId: string; restaurantId?: string; branchId?: string; inviteRequired?: boolean }

export default function CreateOwnerClient() {
  const supabase = createClient()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('owner')
  const [result, setResult] = useState<Result | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)

  const [s1, setS1] = useState<Step1>({
    ownerName: '', ownerEmail: '', ownerPhone: '',
    businessName: '', plan: 'standard', maxRestaurants: '3',
  })
  const [s2, setS2] = useState<Step2>({
    restaurantName: '', restaurantSlug: '', city: '',
    phone: '', email: '', currency: 'INR', currencySymbol: '₹',
  })

  // Auto-generate slug from restaurant name
  const genSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

  // ── Step 1: Provision owner ──────────────────────────────
  const handleProvisionOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true); setError(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase.rpc as any)('provision_owner', {
      p_owner_email:     s1.ownerEmail,
      p_owner_name:      s1.ownerName,
      p_owner_phone:     s1.ownerPhone,
      p_business_name:   s1.businessName,
      p_plan:            s1.plan,
      p_max_restaurants: parseInt(s1.maxRestaurants, 10),
    })

    if (err) { setError(err.message); setIsLoading(false); return }

    const res = data as { status: string; owner_id?: string; profile_id?: string; message?: string }

    if (res.status === 'invite_required') {
      setInviteSent(false)
      setError(`⚠️ No account found for ${s1.ownerEmail}. Send the invite below first, then retry.`)
      setIsLoading(false)
      return
    }

    setResult({ ownerId: res.owner_id!, profileId: res.profile_id! })
    setPhase('restaurant')
    setIsLoading(false)
  }

  // ── Send Supabase magic-link invite ──────────────────────
  const handleSendInvite = async () => {
    setIsLoading(true); setError(null)
    // Use the Supabase client signInWithOtp to send a magic link
    const { error: err } = await supabase.auth.signInWithOtp({
      email: s1.ownerEmail,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) { setError(err.message); setIsLoading(false); return }
    setInviteSent(true)
    setError(null)
    setIsLoading(false)
  }

  // ── Step 2: Provision restaurant ─────────────────────────
  const handleProvisionRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!result) return
    setIsLoading(true); setError(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase.rpc as any)('provision_restaurant', {
      p_owner_id:        result.ownerId,
      p_name:            s2.restaurantName,
      p_slug:            s2.restaurantSlug,
      p_city:            s2.city || null,
      p_phone:           s2.phone || null,
      p_email:           s2.email || null,
      p_currency:        s2.currency,
      p_currency_symbol: s2.currencySymbol,
    })

    if (err) { setError(err.message); setIsLoading(false); return }
    const res = data as { status: string; restaurant_id?: string; branch_id?: string }
    setResult(prev => ({ ...prev!, restaurantId: res.restaurant_id, branchId: res.branch_id }))
    setPhase('done')
    setIsLoading(false)
  }

  const STEP_LABELS = ['Owner Account', 'Restaurant Setup', 'Complete']
  const phaseIdx = phase === 'owner' ? 0 : phase === 'restaurant' ? 1 : 2

  return (
    <main className="page-content" style={{ maxWidth: '640px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Provision Restaurant Owner</h1>
          <p className="page-subtitle">Create a new owner account and set up their first restaurant.</p>
        </div>
        <a href="/admin/owners" className="btn btn-secondary">← Back</a>
      </div>

      {/* Progress steps */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '32px' }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: i < phaseIdx ? '#22C55E' : i === phaseIdx ? '#FF6B35' : 'rgba(255,255,255,0.08)',
                    border: `2px solid ${i < phaseIdx ? '#22C55E' : i === phaseIdx ? '#FF6B35' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.78rem', fontWeight: 800,
                    color: i <= phaseIdx ? 'white' : '#525252',
                    flexShrink: 0,
                  }}
                >
                  {i < phaseIdx ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: i === phaseIdx ? 700 : 400, color: i === phaseIdx ? '#F5F5F5' : '#525252' }}>
                  {label}
                </span>
              </div>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ flex: 1, height: '2px', background: i < phaseIdx ? '#22C55E' : 'rgba(255,255,255,0.06)', margin: '0 8px' }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px' }}>

        {/* ── PHASE 1: Owner ── */}
        {phase === 'owner' && (
          <form onSubmit={handleProvisionOwner} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '4px' }}>👤 Owner Account</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" value={s1.ownerName} onChange={e => setS1(p => ({ ...p, ownerName: e.target.value }))} placeholder="John Smith" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input type="tel" className="form-input" value={s1.ownerPhone} onChange={e => setS1(p => ({ ...p, ownerPhone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input type="email" className="form-input" value={s1.ownerEmail} onChange={e => setS1(p => ({ ...p, ownerEmail: e.target.value }))} placeholder="owner@restaurant.com" required autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Business / Brand Name</label>
              <input type="text" className="form-input" value={s1.businessName} onChange={e => setS1(p => ({ ...p, businessName: e.target.value }))} placeholder="Smith Hospitality Group" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Subscription Plan</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {PLANS.map(plan => (
                    <button
                      key={plan.value} type="button"
                      onClick={() => setS1(p => ({ ...p, plan: plan.value }))}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: '10px', border: '1.5px solid',
                        borderColor: s1.plan === plan.value ? '#FF6B35' : 'rgba(255,255,255,0.1)',
                        background: s1.plan === plan.value ? 'rgba(255,107,53,0.12)' : 'transparent',
                        color: s1.plan === plan.value ? '#FF6B35' : '#737373',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center',
                      }}
                    >
                      {plan.label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#737373', marginTop: '6px' }}>
                  {PLANS.find(p => p.value === s1.plan)?.desc}
                </p>
              </div>
              <div className="form-group" style={{ width: '100px' }}>
                <label className="form-label">Max Restaurants</label>
                <input type="number" className="form-input" value={s1.maxRestaurants} onChange={e => setS1(p => ({ ...p, maxRestaurants: e.target.value }))} min={1} max={50} />
              </div>
            </div>

            {/* Invite helper */}
            {error && (
              <div>
                <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#FCA5A5', fontSize: '0.83rem', marginBottom: '10px' }}>
                  {error}
                </div>
                {s1.ownerEmail && (
                  <button type="button" className="btn btn-secondary" onClick={handleSendInvite} disabled={isLoading || inviteSent} style={{ width: '100%' }}>
                    {inviteSent ? '✅ Invite Sent! Now retry below.' : `📧 Send Magic-Link Invite to ${s1.ownerEmail}`}
                  </button>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={isLoading || !s1.ownerEmail || !s1.ownerName} style={{ marginTop: '8px' }}>
              {isLoading ? 'Provisioning...' : 'Create Owner & Continue →'}
            </button>
          </form>
        )}

        {/* ── PHASE 2: Restaurant ── */}
        {phase === 'restaurant' && (
          <form onSubmit={handleProvisionRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', color: '#86EFAC', fontSize: '0.83rem', marginBottom: '4px' }}>
              ✅ Owner account ready. Now set up their first restaurant.
            </div>

            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F5F5F5' }}>🏪 Restaurant Details</h2>

            <div className="form-group">
              <label className="form-label">Restaurant Name *</label>
              <input
                type="text" className="form-input" value={s2.restaurantName} required autoFocus
                onChange={e => setS2(p => ({ ...p, restaurantName: e.target.value, restaurantSlug: genSlug(e.target.value) }))}
                placeholder="The Grand Kitchen"
              />
            </div>

            <div className="form-group">
              <label className="form-label">URL Slug *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <span style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: '0.82rem', color: '#737373', whiteSpace: 'nowrap' }}>
                  restpilot.app/
                </span>
                <input
                  type="text" className="form-input" value={s2.restaurantSlug} required
                  onChange={e => setS2(p => ({ ...p, restaurantSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  style={{ borderRadius: '0 10px 10px 0' }}
                  placeholder="the-grand-kitchen"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input type="text" className="form-input" value={s2.city} onChange={e => setS2(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input type="tel" className="form-input" value={s2.phone} onChange={e => setS2(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={s2.email} onChange={e => setS2(p => ({ ...p, email: e.target.value }))} placeholder="info@restaurant.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" className="form-input" value={s2.currencySymbol} onChange={e => setS2(p => ({ ...p, currencySymbol: e.target.value }))} placeholder="₹" style={{ width: '60px' }} />
                  <input type="text" className="form-input" value={s2.currency} onChange={e => setS2(p => ({ ...p, currency: e.target.value.toUpperCase() }))} placeholder="INR" style={{ width: '80px' }} />
                </div>
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#FCA5A5', fontSize: '0.83rem' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary flex-1" onClick={() => { setPhase('done'); setResult(r => ({ ...r! })) }}>
                Skip Restaurant
              </button>
              <button type="submit" className="btn btn-primary flex-1" disabled={isLoading || !s2.restaurantName || !s2.restaurantSlug}>
                {isLoading ? 'Creating...' : 'Create Restaurant →'}
              </button>
            </div>
          </form>
        )}

        {/* ── PHASE 3: Done ── */}
        {phase === 'done' && result && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F5F5F5', marginBottom: '10px' }}>Owner Provisioned!</h2>
            <p style={{ color: '#737373', fontSize: '0.88rem', marginBottom: '24px' }}>
              <strong style={{ color: '#F5F5F5' }}>{s1.ownerEmail}</strong> is now a restaurant owner on RestPilot.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px', textAlign: 'left' }}>
              {[
                { label: 'Owner ID', value: result.ownerId },
                { label: 'Email', value: s1.ownerEmail },
                result.restaurantId ? { label: 'Restaurant ID', value: result.restaurantId } : null,
              ].filter(Boolean).map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#737373' }}>{row!.label}</span>
                  <span style={{ fontSize: '0.78rem', color: '#F5F5F5', fontFamily: 'monospace' }}>{row!.value?.slice(0, 24)}…</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary flex-1" onClick={() => { setPhase('owner'); setResult(null); setS1({ ownerName: '', ownerEmail: '', ownerPhone: '', businessName: '', plan: 'standard', maxRestaurants: '3' }); setS2({ restaurantName: '', restaurantSlug: '', city: '', phone: '', email: '', currency: 'INR', currencySymbol: '₹' }) }}>
                + Create Another
              </button>
              <button className="btn btn-primary flex-1" onClick={() => router.push('/admin/owners')}>
                View All Owners →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Subscriptions — RestPilot Admin' }

interface SubRow {
  id: string
  subscription_plan: string
  subscription_status: string
  subscription_expires_at: string | null
  restaurants: Array<{ name: string; slug: string }> | null
}

const PLAN_COLORS: Record<string, string> = {
  free: '#737373', standard: '#3B82F6', premium: '#F59E0B',
}
const STATUS_COLORS: Record<string, string> = {
  active: '#22C55E', trial: '#F59E0B', suspended: '#EF4444', cancelled: '#737373', expired: '#EF4444',
}

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient()

  // Page-level auth guard (defense in depth — layout also checks)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profileRaw } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: string } | null
  if (profile?.role !== 'platform_admin') redirect('/dashboard')

  const { data: subsRaw } = await supabase
    .from('owners')
    .select(`
      id, subscription_plan, subscription_status, subscription_expires_at,
      restaurants (name, slug)
    `)
    .order('subscription_expires_at', { ascending: true, nullsFirst: false })

  const subs = (subsRaw as unknown as SubRow[]) ?? []
  const currentTime = new Date().getTime()

  const planCounts = subs.reduce((acc: Record<string, number>, s) => {
    acc[s.subscription_plan] = (acc[s.subscription_plan] ?? 0) + 1
    return acc
  }, {})

  return (
    <main className="page-content">
      <div className="page-header">
        <h1 className="page-title">Subscriptions</h1>
      </div>

      {/* Plan breakdown */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        {Object.entries(planCounts).map(([plan, count]) => (
          <div
            key={plan}
            className="stat-card"
            style={{ '--stat-color': PLAN_COLORS[plan] ?? '#737373' } as React.CSSProperties}
          >
            <div className="stat-value">{count}</div>
            <div className="stat-label">{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</div>
          </div>
        ))}
      </div>

      {/* Subscription table */}
      <div
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 120px 160px',
            gap: '12px',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {['Restaurant', 'Plan', 'Status', 'Period Ends'].map(h => (
            <span key={h} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </span>
          ))}
        </div>

        {subs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#525252' }}>No subscriptions.</div>
        ) : (
          subs.map((sub, idx) => {
            const endDate = sub.subscription_expires_at ? new Date(sub.subscription_expires_at) : null
            const isExpiringSoon = endDate && endDate.getTime() - currentTime < 7 * 24 * 60 * 60 * 1000

            return (
              <div
                key={sub.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 120px 160px',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: isExpiringSoon ? 'rgba(239,68,68,0.03)' : 'transparent',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F5F5F5' }}>
                    {sub.restaurants?.[0]?.name ?? '—'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#525252' }}>
                    /{sub.restaurants?.[0]?.slug}
                  </div>
                </div>

                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: `${PLAN_COLORS[sub.subscription_plan] ?? '#737373'}15`,
                    color: PLAN_COLORS[sub.subscription_plan] ?? '#737373',
                    border: `1px solid ${PLAN_COLORS[sub.subscription_plan] ?? '#737373'}30`,
                  }}
                >
                  {sub.subscription_plan}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_COLORS[sub.subscription_status] ?? '#737373' }} />
                  <span style={{ fontSize: '0.78rem', color: STATUS_COLORS[sub.subscription_status] ?? '#737373', textTransform: 'capitalize' }}>
                    {sub.subscription_status}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: isExpiringSoon ? '#EF4444' : '#737373' }}>
                    {endDate ? endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                  </span>
                  {isExpiringSoon && (
                    <span style={{ fontSize: '0.65rem', color: '#EF4444', fontWeight: 700 }}>⚠ Soon</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}

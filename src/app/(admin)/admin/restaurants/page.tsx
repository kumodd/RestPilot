import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'All Restaurants — RestPilot Admin' }

interface RestaurantRow {
  id: string
  name: string
  slug: string
  is_active: boolean
  subscription_plan: string
  subscription_status: string
  created_at: string
  owners: { profiles: { full_name: string | null; phone: string | null } | null } | null
}

export default async function AdminRestaurantsPage() {
  const supabase = await createClient()

  // Page-level auth guard (defense in depth — layout also checks)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profileRaw } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: string } | null
  if (profile?.role !== 'platform_admin') redirect('/dashboard')

  const { data: restaurantsRaw } = await supabase
    .from('restaurants')
    .select(`
      id, name, slug, is_active, subscription_plan, subscription_status, created_at,
      owners (
        profiles (full_name, phone)
      )
    `)
    .order('created_at', { ascending: false })

  const restaurants = (restaurantsRaw as unknown as RestaurantRow[]) ?? []

  const PLAN_COLORS: Record<string, string> = {
    free: '#737373', standard: '#3B82F6', premium: '#F59E0B',
  }

  const STATUS_COLORS: Record<string, string> = {
    active: '#22C55E', trial: '#F59E0B', suspended: '#EF4444', cancelled: '#737373', expired: '#EF4444',
  }

  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Restaurants</h1>
          <p className="page-subtitle">{restaurants.length} restaurants registered</p>
        </div>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 120px 120px 140px',
            gap: '12px',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {['Restaurant', 'Owner', 'Plan', 'Status', 'Joined'].map(h => (
            <span key={h} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {restaurants.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#525252' }}>No restaurants yet.</div>
        ) : (
          restaurants.map((r, idx) => (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 160px 120px 120px 140px',
                gap: '12px',
                alignItems: 'center',
                padding: '14px 20px',
                borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.15s',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F5F5F5' }}>{r.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#525252' }}>/{r.slug}</div>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#A3A3A3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.owners?.profiles?.full_name ?? '—'}
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
                  background: `${PLAN_COLORS[r.subscription_plan] ?? '#737373'}15`,
                  color: PLAN_COLORS[r.subscription_plan] ?? '#737373',
                  border: `1px solid ${PLAN_COLORS[r.subscription_plan] ?? '#737373'}30`,
                }}
              >
                {r.subscription_plan}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: STATUS_COLORS[r.subscription_status] ?? '#737373',
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: STATUS_COLORS[r.subscription_status] ?? '#737373', textTransform: 'capitalize' }}>
                  {r.subscription_status}
                </span>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#737373' }}>
                {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}

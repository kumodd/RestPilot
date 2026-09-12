import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatPriceCompact } from '@/lib/utils/price'

export const metadata: Metadata = {
  title: 'Platform Overview — RestPilot Admin',
}

interface RestaurantRow {
  id: string
  name: string
  is_active: boolean
  created_at: string
  subscription_plan: string
}

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { data: restaurantsRaw, count: restaurantCount },
    { data: ownersRaw, count: ownerCount },
    { data: ordersRaw },
  ] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, is_active, created_at, subscription_plan', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('owners')
      .select('id', { count: 'exact' }),
    supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const restaurants = (restaurantsRaw as RestaurantRow[] | null) ?? []
  const activeRestaurants = restaurants.filter(r => r.is_active).length
  const monthlyRevenue = (ordersRaw as Array<{ total: number }> | null)
    ?.reduce((acc, o) => acc + (o.total ?? 0), 0) ?? 0
  const monthlyOrders = ordersRaw?.length ?? 0

  const PLAN_COLORS: Record<string, string> = {
    free: '#737373',
    standard: '#3B82F6',
    premium: '#F59E0B',
  }

  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <p className="page-subtitle">All restaurants on RestPilot</p>
        </div>
        <div className="live-indicator">
          <div className="live-dot" />
          Admin
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {[
          { label: 'Total Restaurants', value: restaurantCount ?? 0, color: '#3B82F6', icon: '🏪' },
          { label: 'Active Restaurants', value: activeRestaurants, color: '#22C55E', icon: '✅' },
          { label: 'Restaurant Owners', value: ownerCount ?? 0, color: '#8B5CF6', icon: '👤' },
          { label: '30-Day Orders', value: monthlyOrders, color: '#FF6B35', icon: '📋' },
          { label: '30-Day GMV', value: formatPriceCompact(monthlyRevenue), color: '#22C55E', icon: '💰' },
        ].map(stat => (
          <div
            key={stat.label}
            className="stat-card"
            style={{ '--stat-color': stat.color } as React.CSSProperties}
          >
            <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Restaurants */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recent Restaurants
          </h2>
          <a href="/admin/restaurants" style={{ fontSize: '0.8rem', color: '#FF6B35', textDecoration: 'none' }}>
            View All →
          </a>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {restaurants.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#525252' }}>No restaurants yet.</div>
          ) : (
            restaurants.map((r, idx) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 20px',
                  borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #FF6B35, #8B5CF6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  🏪
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#525252' }}>
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span
                  style={{
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
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: r.is_active ? '#22C55E' : '#EF4444',
                    flexShrink: 0,
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Admin Links */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
          Admin Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            { label: 'All Owners', icon: '👤', href: '/admin/owners' },
            { label: 'Provision Owner', icon: '➕', href: '/admin/owners/create' },
            { label: 'All Restaurants', icon: '🏪', href: '/admin/restaurants' },
            { label: 'Subscriptions', icon: '💳', href: '/admin/subscriptions' },
            { label: 'Platform Analytics', icon: '📊', href: '/admin/analytics' },
            { label: 'Back to Dashboard', icon: '↩', href: '/dashboard' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{link.icon}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#A3A3A3' }}>{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}

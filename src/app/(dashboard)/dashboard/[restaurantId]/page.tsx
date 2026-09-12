import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatPriceCompact } from '@/lib/utils/price'
import type { Profile } from '@/lib/types/app.types'

export const metadata: Metadata = {
  title: 'Restaurant Overview — RestPilot',
  description: 'Restaurant operations overview with live order board.',
}

interface OrderRow {
  id: string
  status: string
  total: number
}

export default async function RestaurantOverviewPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: restaurantRaw } = await supabase
    .from('restaurants')
    .select('name, currency_symbol')
    .eq('id', restaurantId)
    .single()

  const restaurant = restaurantRaw as { name: string; currency_symbol: string | null } | null

  if (!restaurant) return null

  const currencySymbol = restaurant.currency_symbol || '₹'

  // Fetch today's orders stats for THIS restaurant
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('orders')
    .select('id, status, total')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', today.toISOString())

  const todayOrders = (data as OrderRow[] | null) ?? []

  const todayStats = {
    total: todayOrders.length,
    active: todayOrders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length,
    awaiting: todayOrders.filter(o => o.status === 'awaiting_waiter_verification').length,
    preparing: todayOrders.filter(o => o.status === 'preparing').length,
    ready: todayOrders.filter(o => o.status === 'ready').length,
    sales: todayOrders.reduce((acc, o) => acc + (o.total ?? 0), 0),
    avgOrder: todayOrders.length
      ? todayOrders.reduce((acc, o) => acc + (o.total ?? 0), 0) / todayOrders.length
      : 0,
  }

  // Fetch branches to get a default branchId for quick links
  const { data: branchesRaw } = await supabase
    .from('branches')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('is_main_branch', { ascending: false })
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultBranchId = (branchesRaw as any[])?.[0]?.id || 'unknown'

  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const userRole = (profileRaw as { role: string } | null)?.role || 'waiter'

  const allActions = [
    { label: 'Live Orders', icon: '📊', href: `/dashboard/${restaurantId}/${defaultBranchId}/orders`, color: '#3B82F6', roles: ['owner', 'platform_admin', 'manager', 'waiter', 'cashier'] },
    { label: 'Manage Menu', icon: '🍽️', href: `/dashboard/${restaurantId}/menu`, color: '#FF6B35', roles: ['owner', 'platform_admin', 'manager'] },
    { label: 'Tables & QR', icon: '🪑', href: `/dashboard/${restaurantId}/${defaultBranchId}/tables`, color: '#8B5CF6', roles: ['owner', 'platform_admin', 'manager', 'waiter'] },
    { label: 'Staff', icon: '👥', href: `/dashboard/${restaurantId}/staff`, color: '#22C55E', roles: ['owner', 'platform_admin', 'manager'] },
    { label: 'Suggestions', icon: '💡', href: `/dashboard/${restaurantId}/suggestions`, color: '#F59E0B', roles: ['owner', 'platform_admin', 'manager'] },
    { label: 'Reports', icon: '📈', href: `/dashboard/${restaurantId}/${defaultBranchId}/reports`, color: '#EC4899', roles: ['owner', 'platform_admin', 'manager'] },
  ]

  const permittedActions = allActions.filter(action => action.roles.includes(userRole))

  return (
    <main className="page-content">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{restaurant.name} Overview</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="live-indicator">
          <div className="live-dot" />
          Live
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {[
        { label: "Today's Orders", value: todayStats.total, color: '#3B82F6', icon: '📋' },
        { label: "Today's Sales", value: formatPriceCompact(todayStats.sales, currencySymbol), color: '#22C55E', icon: '💰' },
        { label: 'Avg Order Value', value: formatPrice(todayStats.avgOrder, currencySymbol), color: '#8B5CF6', icon: '📊' },
        { label: 'Active Orders', value: todayStats.active, color: '#FF6B35', icon: '🔥' },
        { label: 'Awaiting Waiter', value: todayStats.awaiting, color: '#F59E0B', icon: '⏳' },
        { label: 'Preparing', value: todayStats.preparing, color: '#06B6D4', icon: '👨‍🍳' },
        { label: 'Ready to Serve', value: todayStats.ready, color: '#22C55E', icon: '🔔' },
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

      {/* Quick Links */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#A3A3A3',
          marginBottom: '16px',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.06em',
        }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {permittedActions.map(link => (
            <a
              key={link.label}
              href={link.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                padding: '20px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>{link.icon}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#A3A3A3' }}>{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}

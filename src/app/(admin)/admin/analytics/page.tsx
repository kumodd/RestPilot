import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Analytics — RestPilot Admin' }

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: string } | null
  if (profile?.role !== 'platform_admin') redirect('/dashboard')

  const from = new Date()
  from.setDate(from.getDate() - 30)
  const [{ count: restaurantCount }, { count: ownerCount }, { data: orders }] = await Promise.all([
    supabase.from('restaurants').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('owners').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('orders').select('restaurant_id, total, status, created_at').gte('created_at', from.toISOString()),
  ])

  const rows = (orders ?? []) as Array<{ restaurant_id: string; total: number; status: string; created_at: string }>
  const completed = rows.filter(order => order.status === 'completed')
  const sales = completed.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const byRestaurant = new Map<string, { orders: number; sales: number }>()
  rows.forEach(order => {
    const existing = byRestaurant.get(order.restaurant_id) ?? { orders: 0, sales: 0 }
    existing.orders += 1
    if (order.status === 'completed') existing.sales += Number(order.total || 0)
    byRestaurant.set(order.restaurant_id, existing)
  })
  const restaurantIds = [...byRestaurant.keys()]
  const { data: restaurantRowsRaw } = restaurantIds.length ? await supabase.from('restaurants').select('id, name').in('id', restaurantIds) : { data: [] as Array<{ id: string; name: string }> }
  const restaurantRows = restaurantRowsRaw as unknown as Array<{ id: string; name: string }>
  const restaurantNames = new Map((restaurantRows ?? []).map(restaurant => [restaurant.id, restaurant.name]))
  const performance = [...byRestaurant.entries()].sort((a, b) => b[1].sales - a[1].sales).slice(0, 10)

  return (
    <main className="page-content" style={{ maxWidth: '1100px' }}>
      <div className="page-header"><div><h1 className="page-title">Platform Analytics</h1><p className="page-subtitle">Last 30 days across active restaurants</p></div></div>
      <div className="stats-grid">
        {[[restaurantCount ?? 0, 'Active restaurants', '#FF6B35'], [ownerCount ?? 0, 'Active owners', '#8B5CF6'], [rows.length, 'Orders', '#3B82F6'], [`₹${sales.toLocaleString('en-IN')}`, 'Completed sales', '#22C55E']].map(([value, label, color]) => <div className="stat-card" key={String(label)} style={{ '--stat-color': color } as React.CSSProperties}><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>)}
      </div>
      <section className="card" style={{ marginTop: '24px' }}><h2 className="section-title">Restaurant performance</h2>{performance.length === 0 ? <p className="empty-state-desc">No orders in this period.</p> : <table className="tracking-table"><thead><tr><th>Restaurant</th><th>Orders</th><th>Completed sales</th></tr></thead><tbody>{performance.map(([id, values]) => <tr key={id}><td>{restaurantNames.get(id) ?? id}</td><td>{values.orders}</td><td>₹{values.sales.toLocaleString('en-IN')}</td></tr>)}</tbody></table>}</section>
    </main>
  )
}

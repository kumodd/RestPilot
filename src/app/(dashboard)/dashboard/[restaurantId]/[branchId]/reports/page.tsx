import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Reports — RestPilot' }

interface ReportData {
  orders?: number
  completed_orders?: number
  sales?: number
  paid_sales?: number
  average_order_value?: number
  top_items?: Array<{ item_name: string; quantity: number; revenue: number }>
  daily?: Array<{ day: string; orders: number; revenue: number }>
  error?: string
}

export default async function ReportsPage({ params }: { params: Promise<{ restaurantId: string; branchId: string }> }) {
  const { branchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw, error } = await (supabase.rpc as any)('get_branch_report', {
    p_branch_id: branchId,
  })
  const report: ReportData = raw && typeof raw === 'object'
    ? raw as ReportData
    : { error: error?.message ?? 'Unable to load report' }

  return (
    <main className="page-content" style={{ maxWidth: '1100px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Last 30 days · branch performance</p>
        </div>
      </div>
      {report.error ? (
        <div className="empty-state"><div className="empty-state-icon">⚠️</div><h2 className="empty-state-title">Report unavailable</h2><p className="empty-state-desc">{report.error}</p></div>
      ) : (
        <>
          <div className="stats-grid">
            {[
              ['Orders', report.orders ?? 0, '#8B5CF6'],
              ['Completed', report.completed_orders ?? 0, '#22C55E'],
              ['Sales', `₹${Number(report.sales ?? 0).toLocaleString('en-IN')}`, '#FF6B35'],
              ['Average order', `₹${Number(report.average_order_value ?? 0).toLocaleString('en-IN')}`, '#3B82F6'],
            ].map(([label, value, color]) => (
              <div className="stat-card" key={String(label)} style={{ '--stat-color': color } as React.CSSProperties}>
                <div className="stat-value">{value}</div><div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
            <section className="card">
              <h2 className="section-title">Top items</h2>
              {(report.top_items ?? []).length === 0 ? <p className="empty-state-desc">No completed items yet.</p> : report.top_items?.map(item => (
                <div key={item.item_name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span>{item.item_name} <small style={{ color: '#737373' }}>×{item.quantity}</small></span><strong>₹{Number(item.revenue).toLocaleString('en-IN')}</strong>
                </div>
              ))}
            </section>
            <section className="card">
              <h2 className="section-title">Daily sales</h2>
              {(report.daily ?? []).length === 0 ? <p className="empty-state-desc">No sales in this period.</p> : (
                <div style={{ maxHeight: '360px', overflow: 'auto' }}>{report.daily?.map(day => (
                  <div key={day.day} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: '#A1A1AA' }}>{day.day}</span><span>{day.orders} orders · <strong>₹{Number(day.revenue).toLocaleString('en-IN')}</strong></span>
                  </div>
                ))}</div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  )
}

import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Reports — RestPilot' }
export default function ReportsPage() {
  return (
    <main className="page-content">
      <div className="page-header"><h1 className="page-title">Reports & Analytics</h1></div>
      <div className="empty-state">
        <div className="empty-state-icon">📈</div>
        <h2 className="empty-state-title">Analytics Dashboard</h2>
        <p className="empty-state-desc">View daily sales, top items, waiter performance, and restaurant comparison reports.</p>
      </div>
    </main>
  )
}

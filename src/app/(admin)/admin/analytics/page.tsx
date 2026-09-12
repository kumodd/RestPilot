import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Analytics — RestPilot Admin' }
export default function AdminAnalyticsPage() {
  return (
    <main className="page-content">
      <div className="page-header"><h1 className="page-title">Platform Analytics</h1></div>
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <h2 className="empty-state-title">Analytics Coming Soon</h2>
        <p className="empty-state-desc">Revenue trends, order volumes, and restaurant performance charts.</p>
      </div>
    </main>
  )
}

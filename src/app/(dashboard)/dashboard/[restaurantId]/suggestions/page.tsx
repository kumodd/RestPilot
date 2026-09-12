import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Waiter Suggestions — RestPilot' }
export default function SuggestionsPage() {
  return (
    <main className="page-content">
      <div className="page-header"><h1 className="page-title">Waiter Suggestions</h1></div>
      <div className="empty-state">
        <div className="empty-state-icon">💡</div>
        <h2 className="empty-state-title">Configure Recommendations</h2>
        <p className="empty-state-desc">Set up owner-approved items that waiters can suggest to customers at the table.</p>
      </div>
    </main>
  )
}

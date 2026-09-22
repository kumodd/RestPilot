export default function Loading() {
  return (
    <div className="customer-state-page">
      <div className="customer-state-card">
        <div className="customer-spinner" />
        <p>Loading your workspace…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

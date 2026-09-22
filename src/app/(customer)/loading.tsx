export default function Loading() {
  return (
    <div className="customer-state-page">
      <div className="customer-state-card">
        <div className="customer-spinner" />
        <span>Preparing your menu…</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

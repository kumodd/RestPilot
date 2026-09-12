// ============================================================
// RestPilot — Price Utilities
// ============================================================

export function formatPrice(amount: number, symbol: string = '₹'): string {
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function formatPriceCompact(amount: number, symbol: string = '₹'): string {
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`
  return formatPrice(amount, symbol)
}

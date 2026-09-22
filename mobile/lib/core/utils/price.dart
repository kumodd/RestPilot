// ============================================================
// RestPilot — Price Formatter (mirrors web formatPrice)
// ============================================================

String formatPrice(num amount, [String? currencySymbol]) {
  final symbol = currencySymbol ?? '₹';
  final formatted = amount.toStringAsFixed(2);
  // Remove trailing .00 only when amount is a whole number
  if (formatted.endsWith('.00')) {
    return '$symbol${amount.toInt()}';
  }
  return '$symbol$formatted';
}

String formatPriceCompact(num amount, [String? symbol]) {
  final s = symbol ?? '₹';
  if (amount >= 10000000) return '$s${(amount / 10000000).toStringAsFixed(1)}Cr';
  if (amount >= 100000) return '$s${(amount / 100000).toStringAsFixed(1)}L';
  if (amount >= 1000) return '$s${(amount / 1000).toStringAsFixed(1)}K';
  return formatPrice(amount, s);
}

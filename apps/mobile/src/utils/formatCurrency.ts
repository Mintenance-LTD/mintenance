/**
 * Format a numeric amount as a currency string.
 *
 * Uses Intl.NumberFormat when available (most React Native environments),
 * falls back to manual formatting. Default currency is GBP (British Pounds)
 * since Mintenance currently operates in the UK market.
 *
 * Usage:
 *   formatCurrency(150)        // "£150.00"
 *   formatCurrency(1500.5)     // "£1,500.50"
 *   formatCurrency(0)          // "£0.00"
 *   formatCurrency(null)       // "—"
 *   formatCurrency(undefined)  // "—"
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string = 'GBP',
  locale: string = 'en-GB'
): string {
  if (amount == null) return '—';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for environments without Intl support
    const symbol =
      currencyCode === 'GBP'
        ? '£'
        : currencyCode === 'USD'
          ? '$'
          : currencyCode === 'EUR'
            ? '€'
            : currencyCode;
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Format a currency range (e.g., for budget display).
 */
export function formatCurrencyRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currencyCode: string = 'GBP'
): string {
  if (min == null && max == null) return '—';
  if (min != null && max != null)
    return `${formatCurrency(min, currencyCode)} – ${formatCurrency(max, currencyCode)}`;
  if (min != null) return `From ${formatCurrency(min, currencyCode)}`;
  return `Up to ${formatCurrency(max!, currencyCode)}`;
}

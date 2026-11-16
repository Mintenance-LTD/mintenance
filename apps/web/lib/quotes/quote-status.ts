export function quoteHasExpired(
  validUntil: string | null | undefined,
  now = new Date()
): boolean {
  if (!validUntil) return false;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return validUntil.slice(0, 10) < today;
}

export function effectiveQuoteStatus(
  quote: { status: string; valid_until?: string | null },
  bidStatus?: string,
  now = new Date()
): string {
  if (bidStatus === 'accepted') return 'accepted';
  if (bidStatus === 'rejected' || bidStatus === 'withdrawn') return 'rejected';
  if (
    ['sent', 'viewed'].includes(quote.status) &&
    quoteHasExpired(quote.valid_until, now)
  )
    return 'expired';
  return quote.status;
}

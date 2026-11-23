export const DISPUTE_PAYMENT_PAUSED = 'Dispute under review · payment paused';

export function disputeHref(escrowId: string) {
  return `/disputes/${encodeURIComponent(escrowId)}`;
}

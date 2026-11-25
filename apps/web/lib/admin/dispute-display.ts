export const OPEN_DISPUTE_CASE_STATUSES = [
  'open',
  'under_review',
  'escalated',
  'pending',
] as const;
export const ACTIVE_DISPUTE_REVIEW_STATUSES = [
  'pending_review',
  'admin_hold',
] as const;
export const DISPUTED_PAYMENT_LABEL = 'Held for dispute · release blocked';

export function disputeReviewStatus(
  status: string | null,
  deadline: string | null | undefined,
  now = Date.now()
) {
  const active = status === 'pending_review' || status === 'admin_hold';
  const overdue = active && !!deadline && Date.parse(deadline) < now;
  const label =
    status === 'pending_review'
      ? 'Pending review'
      : status === 'admin_hold'
        ? 'In review'
        : status === 'released'
          ? 'Resolved'
          : status === 'closed'
            ? 'Case closed'
            : 'No active review';
  return {
    active,
    overdue,
    label: overdue ? `Overdue · ${label.toLowerCase()}` : label,
  };
}

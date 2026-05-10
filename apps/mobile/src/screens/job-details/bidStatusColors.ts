/**
 * Bid-status colour mapping. Extracted from JobDetailsScreen
 * 2026-05-09 (AUDIT_PUNCH_LIST P2 #44c) so the bids list can live in
 * its own component without re-defining the helper.
 */
export function bidStatusColors(status: string | undefined): {
  bg: string;
  text: string;
  label: string;
} {
  if (status === 'accepted')
    return { bg: '#D1FAE5', text: '#065F46', label: 'Accepted' };
  if (status === 'rejected')
    return { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' };
  return { bg: '#FEF3C7', text: '#92400E', label: 'Pending' };
}

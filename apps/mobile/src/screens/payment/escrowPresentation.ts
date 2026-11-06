type EscrowState = { status: string; release_blocked_reason?: string };
export type EscrowGroup =
  | 'Needs attention'
  | 'Held in escrow'
  | 'Pending payment'
  | 'Released'
  | 'Refunded or cancelled';

/** Display the recorded payment state without inferring work progress or bank settlement. */
export function getEscrowPresentation(record: EscrowState): {
  group: EscrowGroup;
  label: string;
  description: string;
  stage: 0 | 1 | 2 | 3 | null;
} {
  if (record.status === 'refunded')
    return {
      group: 'Refunded or cancelled',
      label: 'Refunded',
      description: 'Refund recorded. These funds are no longer held in escrow.',
      stage: null,
    };
  if (record.status === 'cancelled')
    return {
      group: 'Refunded or cancelled',
      label: 'Cancelled',
      description: 'This payment was cancelled.',
      stage: null,
    };
  if (['released', 'completed'].includes(record.status))
    return {
      group: 'Released',
      label: 'Escrow released',
      description: 'Released to earnings; bank payout follows separately.',
      stage: 3,
    };
  if (record.release_blocked_reason)
    return {
      group: 'Needs attention',
      label: 'Release needs review',
      description: record.release_blocked_reason,
      stage: null,
    };
  if (record.status === 'pending')
    return {
      group: 'Pending payment',
      label: 'Pending',
      description: 'Payment not yet confirmed.',
      stage: 0,
    };
  if (record.status === 'held')
    return {
      group: 'Held in escrow',
      label: 'Held',
      description: 'Confirmed funds held in escrow.',
      stage: 1,
    };
  if (record.status === 'release_pending')
    return {
      group: 'Held in escrow',
      label: 'Awaiting release',
      description: 'Work approved; funds remain held while release checks run.',
      stage: 2,
    };
  return {
    group: 'Needs attention',
    label:
      record.status === 'failed' ? 'Payment failed' : 'Status needs review',
    description: 'Contact support to confirm this payment record.',
    stage: null,
  };
}

const GROUPS: EscrowGroup[] = [
  'Needs attention',
  'Held in escrow',
  'Pending payment',
  'Released',
  'Refunded or cancelled',
];
export function groupEscrowRecords<T extends EscrowState>(records: T[]) {
  return GROUPS.map((title) => ({
    title,
    data: records.filter(
      (record) => getEscrowPresentation(record).group === title
    ),
  })).filter((section) => section.data.length > 0);
}

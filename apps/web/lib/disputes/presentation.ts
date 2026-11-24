export const DISPUTE_UNDER_REVIEW = 'Dispute under review';
export const DISPUTE_PAYMENT_PAUSED = `${DISPUTE_UNDER_REVIEW} · payment paused`;

export function disputeHref(escrowId: string) {
  return `/disputes/${encodeURIComponent(escrowId)}`;
}

export interface DisputeState {
  status: string;
  dispute_record_status?: string | null;
  resolved_at?: string | null;
  admin_hold_status?: string | null;
  mediation_requested?: boolean | null;
  mediation_requested_at?: string | null;
  mediation_status?: string | null;
}

export function describeDispute(state: DisputeState) {
  const closed = state.dispute_record_status === 'closed';
  const resolved =
    state.dispute_record_status === 'resolved' || !!state.resolved_at;
  const finished = closed || resolved;
  const paymentPaused =
    state.status === 'disputed' || state.admin_hold_status === 'admin_hold';
  const requested = !!(
    state.mediation_requested || state.mediation_requested_at
  );
  let mediation = 'Not requested';
  let nextStep =
    'Mintenance will review the case. Check here for updates or requests for more information.';

  switch (state.mediation_status) {
    case 'scheduled':
      mediation = 'Scheduled';
      nextStep =
        'Check the appointment time and follow the instructions from Mintenance.';
      break;
    case 'in_progress':
      mediation = 'In progress';
      nextStep =
        'Follow the instructions from your mediator and check here for updates.';
      break;
    case 'completed':
      mediation = 'Completed';
      nextStep =
        'Mintenance will review the mediation outcome. Check here for the decision.';
      break;
    default:
      if (requested) {
        mediation = 'Requested';
        nextStep =
          'Mintenance will follow up about arranging mediation. Check here for updates.';
      }
  }

  if (finished) {
    nextStep =
      state.admin_hold_status === 'admin_hold'
        ? 'Mintenance still needs to make a payment decision. Check Payments for updates.'
        : 'Review the case history for the outcome. Check Payments for the current payment status.';
  }

  return {
    title: closed
      ? 'Dispute closed'
      : resolved
        ? 'Dispute resolved'
        : DISPUTE_UNDER_REVIEW,
    paymentPaused,
    mediation,
    nextStep,
    finished,
    canRequestMediation:
      !finished && state.status === 'disputed' && mediation === 'Not requested',
  };
}

export type JobDispute = ReturnType<typeof describeDispute> & { href: string };

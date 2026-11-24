import { DISPUTE_PAYMENT_PAUSED } from '@/lib/disputes/presentation';

export interface JobWorkspaceStatus {
  label: string;
  needsAttention: boolean;
  disputed?: boolean;
}

export interface WorkspaceJob {
  id: string;
  status: string;
  homeowner_id: string;
  payer_user_id?: string | null;
  contractor_id?: string | null;
  archived_at?: string | null;
  completion_confirmed_by_homeowner?: boolean | null;
}

export interface WorkspacePayment {
  job_id: string;
  payer_id: string;
  payee_id: string | null;
  status: string;
  admin_hold_status?: string | null;
  homeowner_approval?: boolean | null;
}

export interface WorkspaceContract {
  job_id: string;
  homeowner_id: string;
  contractor_id: string;
  status: string;
  homeowner_signed_at: string | null;
  contractor_signed_at: string | null;
}

export function isCancelledJob(status: string) {
  return status === 'cancelled' || status === 'canceled';
}

export function jobWorkspaceStatus(
  job: WorkspaceJob,
  actorId: string,
  payments: WorkspacePayment[],
  contract: WorkspaceContract | undefined,
  pendingBids: number,
  hasCompletionPhotos: boolean
): JobWorkspaceStatus {
  const payer = job.payer_user_id ?? job.homeowner_id;
  const currentPayments = payments.filter(
    (payment) =>
      payment.payer_id === payer && payment.payee_id === job.contractor_id
  );
  const payment = currentPayments[0];
  const disputed = payments.some(
    (item) =>
      item.status === 'disputed' &&
      (item.payer_id === actorId ||
        item.payee_id === actorId ||
        (actorId === job.homeowner_id && currentPayments.includes(item)))
  );
  const state = (label: string, needsAttention = false) => ({
    label,
    needsAttention,
  });

  if (job.status === 'disputed' || disputed) {
    return { ...state(DISPUTE_PAYMENT_PAUSED, true), disputed: true };
  }
  if (payment?.status === 'refunded') return state('Payment refunded');
  if (isCancelledJob(job.status)) return state('Job cancelled');
  if (
    payment &&
    !['released', 'completed', 'refunded', 'cancelled', 'canceled'].includes(
      payment.status
    ) &&
    (payment.status === 'pending_review' ||
      ['admin_hold', 'pending_review'].includes(
        payment.admin_hold_status ?? ''
      ))
  ) {
    return state('Payment is on hold for review', true);
  }
  if (job.status === 'draft') return state('Draft ready to finish', true);
  if (['posted', 'pending'].includes(job.status) && !job.contractor_id) {
    return pendingBids
      ? state(
          `Review ${pendingBids} ${pendingBids === 1 ? 'bid' : 'bids'}`,
          actorId === job.homeowner_id
        )
      : state('Waiting for bids');
  }
  if (job.status === 'completed') {
    if (['released', 'completed'].includes(payment?.status ?? '')) {
      return state('Payment released');
    }
    if (
      job.completion_confirmed_by_homeowner ||
      payment?.homeowner_approval ||
      payment?.status === 'release_pending'
    ) {
      return state('Work approved · payment release pending');
    }
    if (
      !['held', 'awaiting_homeowner_approval'].includes(payment?.status ?? '')
    ) {
      return state('Payment needs review', true);
    }
    if (!hasCompletionPhotos) return state('Waiting for completion photos');
    return actorId === payer
      ? state('Review the finished work', true)
      : state('Waiting for the payer to review the work');
  }
  if (job.status === 'in_progress')
    return state('Waiting for the contractor to finish');
  if (job.status === 'assigned') {
    if (!contract || ['draft', 'cancelled'].includes(contract.status))
      return state('Waiting for the contract');
    if (contract.status === 'rejected') return state('Contract declined', true);
    if (contract.status !== 'accepted') {
      if (
        contract.status === 'pending_contractor' &&
        !contract.contractor_signed_at
      )
        return state('Waiting for the contractor to sign');
      if (
        contract.status === 'pending_homeowner' &&
        !contract.homeowner_signed_at
      ) {
        return actorId === contract.homeowner_id
          ? state('Contract needs your signature', true)
          : state('Waiting for the homeowner to sign');
      }
      return state('Contract status needs review', true);
    }
    if (
      !payment ||
      [
        'pending',
        'requires_payment',
        'payment_failed',
        'failed',
        'cancelled',
      ].includes(payment.status)
    ) {
      return actorId === payer
        ? state('Payment needs funding', true)
        : state('Waiting for the payer to fund the job');
    }
    return state('Waiting for work to start');
  }
  return state('Check the job for its latest status');
}

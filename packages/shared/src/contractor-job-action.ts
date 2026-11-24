export const CONTRACTOR_DISPUTE_TITLE = 'Dispute under review';
export const CONTRACTOR_DISPUTE_NEXT_STEP =
  'Mintenance is reviewing the case. Wait for an update and respond if support requests information.';

export interface ContractorJobAction {
  kind: 'dispute' | 'contract' | 'payment' | 'photos' | 'start' | 'blocked';
  label: string;
  detail?: string;
  escrowId?: string;
}

export function contractorJobAction(input: {
  jobStatus: string;
  contractStatus?: string | null;
  homeownerSigned?: boolean;
  paymentStatus?: string | null;
  paymentHold?: string | null;
  disputeEscrowId?: string;
  startRestriction?: string | null;
  hasBeforePhoto?: boolean;
  unavailable?: boolean;
}): ContractorJobAction | undefined {
  if (
    input.disputeEscrowId ||
    input.paymentStatus === 'disputed' ||
    input.jobStatus === 'disputed'
  ) {
    return {
      kind: 'dispute',
      label: CONTRACTOR_DISPUTE_TITLE,
      detail: CONTRACTOR_DISPUTE_NEXT_STEP,
      escrowId: input.disputeEscrowId,
    };
  }
  if (input.jobStatus !== 'assigned') return;
  if (input.unavailable)
    return { kind: 'blocked', label: 'Check job requirements' };
  if (input.contractStatus !== 'accepted') {
    return {
      kind: 'contract',
      label: input.homeownerSigned
        ? 'Sign contract'
        : input.contractStatus === 'pending_homeowner'
          ? 'Waiting for homeowner signature'
          : 'Prepare contract',
    };
  }
  if (
    input.paymentHold === 'admin_hold' ||
    input.paymentHold === 'pending_review'
  ) {
    return { kind: 'blocked', label: 'Payment on hold' };
  }
  if (input.paymentStatus !== 'held') {
    return input.paymentStatus === 'pending'
      ? { kind: 'payment', label: 'Payment settling' }
      : !input.paymentStatus ||
          ['failed', 'cancelled'].includes(input.paymentStatus)
        ? { kind: 'payment', label: 'Waiting for homeowner payment' }
        : { kind: 'blocked', label: 'Check payment status' };
  }
  if (input.startRestriction) {
    return {
      kind: 'blocked',
      label: 'Waiting to start',
      detail: input.startRestriction,
    };
  }
  return input.hasBeforePhoto
    ? { kind: 'start', label: 'Start job' }
    : { kind: 'photos', label: 'Upload before photos' };
}

export function contractorJobReference(id: string) {
  return `Job #${id.slice(0, 6).toUpperCase()}`;
}

export function contractorVisitWindow(
  start?: string | null,
  end?: string | null,
  now = Date.now()
) {
  const startTime = Date.parse(start ?? '');
  if (!Number.isFinite(startTime)) return null;
  const endTime = Date.parse(end ?? '');
  const hasEnd = Number.isFinite(endTime) && endTime > startTime;
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'medium',
  });
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    timeStyle: 'short',
  });
  const day = date.format(startTime);
  const endDay = hasEnd ? date.format(endTime) : day;
  const slot = `${day}, ${time.format(startTime)}`;
  const label = hasEnd
    ? `${slot}–${endDay === day ? '' : `${endDay}, `}${time.format(endTime)} UK time`
    : `${slot} UK time`;
  return { label, passed: hasEnd && endTime <= now };
}

export function pastContractorVisitMessage(action?: ContractorJobAction) {
  if (action?.kind === 'start') {
    return 'You can still start the job in Mintenance. Confirm access with the homeowner or agree a new visit time.';
  }
  if (action?.kind === 'photos') {
    return 'Confirm access with the homeowner or agree a new visit time. Upload before photos before starting.';
  }
  return 'Confirm access with the homeowner or agree a new visit time once the current blocker is cleared.';
}

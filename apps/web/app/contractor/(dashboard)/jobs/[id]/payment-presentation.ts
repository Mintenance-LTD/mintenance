export function contractorPaymentPresentation({
  status,
  adminHold,
  homeownerApproved,
  jobStatus,
  unavailable,
}: {
  status?: string | null;
  adminHold?: string | null;
  homeownerApproved?: boolean | null;
  jobStatus?: string | null;
  unavailable?: boolean;
}) {
  if (unavailable) {
    return {
      kind: 'unavailable',
      label: 'Payment status unavailable',
      detail:
        'Refresh this page or check Contractor Finance before taking any payment action.',
      funded: false,
    } as const;
  }
  if (status === 'released' || status === 'completed') {
    return {
      kind: 'released',
      label: 'Payment released',
      detail:
        'Release is recorded. Check Payouts for the transfer and bank payout status.',
      funded: true,
    } as const;
  }
  if (status === 'refunded') {
    return {
      kind: 'refunded',
      label: 'Payment refunded',
      detail:
        'A refund is recorded for this payment. Check Contractor Finance for details.',
      funded: false,
    } as const;
  }
  const funded = [
    'held',
    'disputed',
    'release_pending',
    'pending_review',
    'awaiting_homeowner_approval',
  ].includes(status ?? '');
  if (status === 'disputed' || jobStatus === 'disputed') {
    return {
      kind: 'disputed',
      label: 'Dispute under review',
      detail: `${funded ? 'The customer payment was received. ' : ''}Payment release is paused while Mintenance reviews the dispute. If the job shows a rework request, use the instructions on that request.`,
      funded,
    } as const;
  }
  if (
    adminHold === 'admin_hold' ||
    adminHold === 'pending_review' ||
    status === 'pending_review'
  ) {
    return {
      kind: 'on_hold',
      label: 'Payment release paused',
      detail: `${funded ? 'The customer payment was received. ' : ''}Mintenance must review the hold before payment can proceed. Follow any requests from support.`,
      funded,
    } as const;
  }
  if (status === 'release_pending') {
    return {
      kind: 'release_pending',
      label: 'Release in progress',
      detail:
        'The customer payment was received. Release is being processed. Check Payouts for transfer and bank status.',
      funded: true,
    } as const;
  }
  if (funded) {
    if (jobStatus === 'completed') {
      return homeownerApproved
        ? ({
            kind: 'held',
            label: 'Approved · release pending',
            detail:
              'The homeowner approved the work. Funds remain in escrow until the recorded hold and release checks are complete.',
            funded: true,
          } as const)
        : ({
            kind: 'held',
            label: 'Awaiting homeowner review',
            detail:
              'The customer payment is held in escrow. The homeowner can review the work, and release depends on the recorded approval and payment checks.',
            funded: true,
          } as const);
    }
    return {
      kind: 'held',
      label: 'Payment held in escrow',
      detail:
        'The customer payment was received and is held in escrow until the review and release checks are complete.',
      funded: true,
    } as const;
  }
  if (status === 'failed' || status === 'cancelled') {
    return {
      kind: 'payment_issue',
      label: status === 'failed' ? 'Payment failed' : 'Payment cancelled',
      detail:
        'Check Contractor Finance or contact Mintenance before arranging any further payment.',
      funded: false,
    } as const;
  }
  if (status && status !== 'pending') {
    return {
      kind: 'unavailable',
      label: 'Payment status unavailable',
      detail:
        'Check Contractor Finance or contact Mintenance to confirm the payment status.',
      funded: false,
    } as const;
  }
  return {
    kind: 'pending',
    label: 'Awaiting payment',
    detail: 'No funded payment is recorded for this job.',
    funded: false,
  } as const;
}

export type ContractorPaymentPresentation = ReturnType<
  typeof contractorPaymentPresentation
>;

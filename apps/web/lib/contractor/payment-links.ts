export function contractorPaymentHref(escrowId: string) {
  return '/contractor/payments/' + encodeURIComponent(escrowId);
}

export function contractorStartHref(jobId: string) {
  return '/contractor/jobs/' + encodeURIComponent(jobId) + '#start-checklist';
}

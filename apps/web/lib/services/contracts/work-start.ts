export interface WorkStartContract {
  status: string;
  cancellation_deadline?: string | null;
  cancellation_requested_at?: string | null;
}

/** The same restriction is shown in the job UI and enforced before starting. */
export function workStartRestriction(
  contract: WorkStartContract | null,
  earlyStartRequested: boolean,
  now = Date.now()
): string | null {
  if (!contract || contract.status !== 'accepted')
    return 'Contract must be signed by both parties before starting the job';
  if (contract.cancellation_requested_at)
    return 'A cancellation notice needs support review before work can start';
  const deadline = Date.parse(contract.cancellation_deadline ?? '');
  if (!Number.isFinite(deadline))
    return 'This agreement needs cancellation-information review. Contact support before starting work.';
  if (now < deadline && !earlyStartRequested)
    return `The homeowner has not requested an early start. Work can start after ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', dateStyle: 'long', timeStyle: 'short' }).format(deadline)} UK time, or after the homeowner records an early-start request in this job’s contract. A scheduled date alone is not consent.`;
  return null;
}

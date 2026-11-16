import { hasEarlyStartRequest } from '@/lib/services/contracts/early-start';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
import { workStartRestriction } from '@/lib/services/contracts/work-start';

/** Travel and location controls must not bypass the waiting-to-start gates. */
export async function assertJobTravelAllowed(
  jobId: string,
  contractorId: string
) {
  const { data: job, error } = await serverSupabase
    .from('jobs')
    .select('contractor_id, status')
    .eq('id', jobId)
    .single();
  if (error || !job || job.contractor_id !== contractorId)
    throw new ForbiddenError('Not assigned to this job');
  if (!['assigned', 'in_progress'].includes(job.status))
    throw new BadRequestError('Job is not active');
  const [
    { data: funding, error: fundingError },
    { data: contract, error: contractError },
  ] = await Promise.all([
    serverSupabase
      .from('escrow_transactions')
      .select('id')
      .eq('job_id', jobId)
      .eq('payee_id', contractorId)
      .eq('status', 'held')
      .limit(1)
      .maybeSingle(),
    serverSupabase
      .from('contracts')
      .select('id, status, cancellation_deadline, cancellation_requested_at')
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId)
      .eq('status', 'accepted')
      .limit(1)
      .maybeSingle(),
  ]);
  if (fundingError || !funding)
    throw new BadRequestError('Payment must be confirmed before going to site');
  if (contractError || !contract)
    throw new BadRequestError('The signed agreement could not be verified');
  let earlyStart = false;
  if (Date.now() < Date.parse(contract.cancellation_deadline ?? '')) {
    earlyStart = await hasEarlyStartRequest(contract.id);
  }
  const reason = workStartRestriction(contract, earlyStart);
  if (reason) throw new BadRequestError(reason);
}

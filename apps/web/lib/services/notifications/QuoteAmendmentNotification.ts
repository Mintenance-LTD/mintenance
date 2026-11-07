import { serverSupabase } from '@/lib/api/supabaseServer';

/** Re-check queued recipients and versions before either in-app or push delivery. */
export async function shouldDeliverQuoteAmendment(
  metadata: Record<string, unknown>,
  userId: string
): Promise<boolean> {
  if (!metadata.quote_amendment_id) return true;
  const { data: amendment, error } = await serverSupabase
    .from('quote_amendments')
    .select('job_id,version,status,customer_id,contractor_id')
    .eq('id', metadata.quote_amendment_id)
    .maybeSingle();
  if (error) throw new Error('Could not verify amendment notification');
  if (!amendment || amendment.version !== metadata.amendment_version)
    return false;
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('homeowner_id,payer_user_id,contractor_id')
    .eq('id', amendment.job_id)
    .maybeSingle();
  if (jobError) throw new Error('Could not verify amendment recipient');
  if (
    !job ||
    job.contractor_id !== amendment.contractor_id ||
    (job.payer_user_id ?? job.homeowner_id) !== amendment.customer_id
  )
    return false;
  const recipient = ['approved', 'rejected'].includes(amendment.status)
    ? amendment.contractor_id
    : amendment.customer_id;
  return userId === recipient;
}

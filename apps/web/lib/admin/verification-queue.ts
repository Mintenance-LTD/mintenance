import { describeVerificationReview, type VerificationReview } from '@/lib/contractor/verification-review';
import { serverSupabase } from '@/lib/api/supabaseServer';

export const VERIFICATION_QUEUE_STATES = [
  'ready',
  'incomplete',
  'verified',
  'rejected',
] as const;
type VerificationQueueState = (typeof VERIFICATION_QUEUE_STATES)[number];

export async function countVerificationQueue(state?: VerificationQueueState) {
  let query = serverSupabase
    .from('admin_verification_queue')
    .select('id', { count: 'exact', head: true });
  if (state) query = query.eq('queue_status', state);
  const { count, error } = await query;
  return error ? null : count;
}

export async function readVerificationQueueCounts() {
  const [ready, incomplete, verified, rejected, total] = await Promise.all([
    ...VERIFICATION_QUEUE_STATES.map((state) => countVerificationQueue(state)),
    countVerificationQueue(),
  ]);
  return { ready, incomplete, verified, rejected, total };
}

export async function readContractorVerificationReview(contractorId: string): Promise<VerificationReview | null> {
  const { data, error } = await serverSupabase.from('admin_verification_queue')
    .select('queue_status,identity_submitted,business_submitted,mobile_credential_submitted,mobile_review_requested,business_details_submitted')
    .eq('id', contractorId).maybeSingle();
  return error || !data ? null : describeVerificationReview(data);
}

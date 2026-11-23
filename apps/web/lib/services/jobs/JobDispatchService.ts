import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  JobNotificationService,
  type JobInvite,
  type NotificationJobContext,
  type NotificationPayload,
} from '@/lib/services/job-notification-service';

interface DispatchClaim {
  job_id: string;
  lease_token: string;
  requested_by: string | null;
  options: {
    preferredContractorId?: string;
    recurring?: NotificationPayload['recurring'];
  };
  job: (NotificationJobContext & { required_skills?: string[] | null }) | null;
}

async function finish(claim: DispatchClaim, invites: JobInvite[] | null) {
  const { data, error } = await serverSupabase.rpc('finish_job_dispatch', {
    p_job_id: claim.job_id,
    p_lease_token: claim.lease_token,
    p_invites: invites,
  });
  if (error) throw new Error('Could not confirm job dispatch');
  return data === true;
}

export async function processJobDispatch() {
  let jobDispatchProcessed = 0;
  let jobDispatchErrors = 0;
  const deadline = Date.now() + 20_000;
  const service = JobNotificationService.getInstance();

  for (let i = 0; i < 3 && Date.now() < deadline; i++) {
    const { data, error } = await serverSupabase.rpc('claim_job_dispatch');
    if (error) throw new Error('Could not claim job dispatch');
    if (!data) break;
    const claim = data as DispatchClaim;
    try {
      let invites: JobInvite[] = [];
      if (claim.job) {
        const { preferredContractorId, recurring } = claim.options;
        const [nearby, preferred] = await Promise.all([
          service.planNearbyInvites(claim.job, {
            required_skills: claim.job.required_skills,
            recurring,
          }),
          preferredContractorId && claim.requested_by
            ? service.planPreferredInvite(
                preferredContractorId,
                claim.job.title,
                claim.requested_by
              )
            : null,
        ]);
        invites = preferred
          ? [
              preferred,
              ...nearby.filter(
                (invite) => invite.user_id !== preferred.user_id
              ),
            ].slice(0, 50)
          : nearby;
      }
      if (await finish(claim, invites)) jobDispatchProcessed++;
    } catch {
      jobDispatchErrors++;
      logger.warn('Job invitation planning did not complete', {
        service: 'job-dispatch',
        jobId: claim.job_id,
      });
      // If finish committed and its response was lost, the old claim is
      // already fenced out. If the database stays down, the lease expires.
      await finish(claim, null);
    }
  }

  const { data, error } = await serverSupabase
    .from('job_dispatch')
    .select('job_id')
    .eq('status', 'needs_attention')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('Could not check job dispatch recovery');
  return {
    jobDispatchProcessed,
    jobDispatchErrors,
    jobDispatchNeedsAttention: !!data,
  };
}

export async function shouldDeliverJobInvite(jobId: unknown): Promise<boolean> {
  if (typeof jobId !== 'string') return false;
  const { data, error } = await serverSupabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .in('status', ['posted', 'open'])
    .is('deleted_at', null)
    .is('archived_at', null)
    .maybeSingle();
  if (error) throw new Error('Could not verify job invitation availability');
  return !!data;
}

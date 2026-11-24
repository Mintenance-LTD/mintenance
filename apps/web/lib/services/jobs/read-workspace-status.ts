import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  jobWorkspaceStatus,
  type WorkspaceContract,
  type WorkspaceJob,
  type WorkspacePayment,
} from '@/lib/jobs/workspace-status';

/** Enrich only the homeowner's authorised jobs from the current list page. */
export async function readWorkspaceStatuses(
  actorId: string,
  jobs: WorkspaceJob[]
) {
  if (!jobs.length) return new Map();

  const ids = jobs.map((job) => job.id);
  const assigned = jobs
    .filter((job) => job.status === 'assigned')
    .map((job) => job.id);
  const bidding = jobs
    .filter((job) => ['posted', 'pending'].includes(job.status))
    .map((job) => job.id);
  const completed = jobs
    .filter(
      (job) =>
        job.status === 'completed' && !job.completion_confirmed_by_homeowner
    )
    .map((job) => job.id);
  const [payments, contracts, bids, photos] = await Promise.all([
    serverSupabase
      .from('escrow_transactions')
      .select(
        'job_id,payer_id,payee_id,status,admin_hold_status,homeowner_approval'
      )
      .in('job_id', ids)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    assigned.length
      ? serverSupabase
          .from('contracts')
          .select(
            'job_id,homeowner_id,contractor_id,status,homeowner_signed_at,contractor_signed_at'
          )
          .in('job_id', assigned)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
      : { data: [], error: null },
    bidding.length
      ? serverSupabase
          .from('bids')
          .select('job_id')
          .in('job_id', bidding)
          .eq('status', 'pending')
      : { data: [], error: null },
    completed.length
      ? serverSupabase
          .from('job_photos_metadata')
          .select('job_id')
          .in('job_id', completed)
          .eq('photo_type', 'after')
          .eq('verified', true)
      : { data: [], error: null },
  ]);
  const error = payments.error ?? contracts.error ?? bids.error ?? photos.error;
  if (error) throw error;

  const paymentsByJob = new Map<string, WorkspacePayment[]>();
  for (const payment of payments.data ?? []) {
    const group = paymentsByJob.get(payment.job_id) ?? [];
    group.push(payment);
    paymentsByJob.set(payment.job_id, group);
  }
  const contractsByJob = new Map<string, WorkspaceContract>();
  for (const contract of contracts.data ?? []) {
    if (!contractsByJob.has(contract.job_id))
      contractsByJob.set(contract.job_id, contract);
  }
  const bidCounts = new Map<string, number>();
  for (const bid of bids.data ?? []) {
    bidCounts.set(bid.job_id, (bidCounts.get(bid.job_id) ?? 0) + 1);
  }
  const jobsWithPhotos = new Set(
    (photos.data ?? []).map((photo) => photo.job_id)
  );

  return new Map(
    jobs.map((job) => {
      const contract = contractsByJob.get(job.id);
      return [
        job.id,
        jobWorkspaceStatus(
          job,
          actorId,
          paymentsByJob.get(job.id) ?? [],
          contract?.contractor_id === job.contractor_id ? contract : undefined,
          bidCounts.get(job.id) ?? 0,
          jobsWithPhotos.has(job.id)
        ),
      ] as const;
    })
  );
}

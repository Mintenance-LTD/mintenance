import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  describeDispute,
  disputeHref,
  type DisputeState,
  type JobDispute,
} from '@/lib/disputes/presentation';
import { logger } from '@/lib/logger';

interface Job {
  id: string;
  homeowner_id: string;
  payer_user_id?: string | null;
  contractor_id?: string | null;
  status: string;
}

interface Escrow extends DisputeState {
  id: string;
  payer_id: string | null;
  payee_id: string | null;
}

export async function readJobDispute(
  job: Job,
  userId: string,
  latestPayment: Escrow | null
): Promise<JobDispute | undefined> {
  const canRead = (payment: Escrow) =>
    payment.payer_id === userId ||
    payment.payee_id === userId ||
    (job.homeowner_id === userId &&
      payment.payer_id === (job.payer_user_id ?? job.homeowner_id) &&
      payment.payee_id === job.contractor_id);

  let payment =
    latestPayment?.status === 'disputed' && canRead(latestPayment)
      ? latestPayment
      : undefined;
  if (!payment) {
    const { data, error } = await serverSupabase
      .from('escrow_transactions')
      .select(
        'id, payer_id, payee_id, status, admin_hold_status, mediation_requested, mediation_requested_at, mediation_status'
      )
      .eq('job_id', job.id)
      .eq('status', 'disputed')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (error) {
      logger.warn('Could not load the job dispute', {
        jobId: job.id,
        code: error.code,
      });
      return;
    }
    payment = data?.find(canRead);
  }

  const disputedPayment = payment ?? latestPayment;
  if (!disputedPayment || !canRead(disputedPayment)) return;
  if (
    !payment &&
    job.status !== 'disputed' &&
    disputedPayment.admin_hold_status !== 'admin_hold'
  )
    return;

  const { data: record, error } = await serverSupabase
    .from('disputes')
    .select('status, resolved_at, dispute_escrow_links!inner(escrow_id)')
    .eq('job_id', job.id)
    .eq('dispute_escrow_links.escrow_id', disputedPayment.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logger.warn('Could not load the job dispute status', {
      jobId: job.id,
      code: error.code,
    });
    return;
  }
  if (!record && disputedPayment.status !== 'disputed') return;

  return {
    ...describeDispute({
      ...disputedPayment,
      dispute_record_status: record?.status,
      resolved_at: record?.resolved_at,
    }),
    href: disputeHref(disputedPayment.id),
  };
}

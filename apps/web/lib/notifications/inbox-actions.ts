import type { SupabaseClient } from '@supabase/supabase-js';
import { disputeHref } from '@/lib/disputes/presentation';
import { isValidUUID } from '@/lib/validation/uuid';
import type { FeedNotification } from './feed';
import { resolveVisitAlert } from './visit-actions';
import {
  contractorAlertTarget,
  presentContractorAlert,
} from './contractor-actions';

export interface InboxRow extends FeedNotification {
  approval_key: string | null;
  action_status?: 'no_longer_actionable';
}

type Actor = { id: string; role?: string };
type Job = {
  id: string;
  homeowner_id: string;
  payer_user_id: string | null;
  contractor_id: string | null;
  status: string;
};
type Payment = {
  id: string;
  job_id: string;
  payer_id: string;
  payee_id: string | null;
  status: string;
  homeowner_approval: boolean | null;
  admin_hold_status: string | null;
  job: Job | Job[] | null;
};

function canReviewPayment(payment: Payment, actor: Actor) {
  const job = Array.isArray(payment.job) ? payment.job[0] : payment.job;
  return (
    job?.id === payment.job_id &&
    job.contractor_id === payment.payee_id &&
    (job.payer_user_id ?? job.homeowner_id) === payment.payer_id &&
    (job.homeowner_id === actor.id || payment.payer_id === actor.id)
  );
}

function reviewIsAvailable(payment: Payment) {
  const job = Array.isArray(payment.job) ? payment.job[0] : payment.job;
  return (
    job?.status === 'completed' &&
    ['held', 'awaiting_homeowner_approval'].includes(payment.status) &&
    payment.homeowner_approval !== true &&
    !['admin_hold', 'pending_review'].includes(payment.admin_hold_status ?? '')
  );
}

async function readReviewPayments(
  db: SupabaseClient,
  rows: InboxRow[]
): Promise<Payment[]> {
  const columns =
    'id,job_id,payer_id,payee_id,status,homeowner_approval,admin_hold_status,job:jobs!escrow_transactions_job_id_fkey(id,homeowner_id,payer_user_id,contractor_id,status)';
  const requests = (['job', 'escrow'] as const).flatMap((kind) => {
    const prefix = `${kind}:`;
    const ids = [
      ...new Set(
        rows.flatMap((row) =>
          row.approval_key?.startsWith(prefix)
            ? [row.approval_key.slice(prefix.length)]
            : []
        )
      ),
    ];
    return ids.length
      ? [
          db
            .from('escrow_transactions')
            .select(columns)
            .in(kind === 'job' ? 'job_id' : 'id', ids),
        ]
      : [];
  });
  const results = await Promise.all(requests);
  return results.flatMap(({ data, error }) => {
    if (error) throw error;
    return (data ?? []) as Payment[];
  });
}

async function readDisputeDestinations(
  db: SupabaseClient,
  actor: Actor,
  rows: InboxRow[]
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(
      rows.flatMap((row) => {
        const id = row.metadata?.disputeId;
        return typeof id === 'string' && isValidUUID(id) ? [id] : [];
      })
    ),
  ];
  if (!ids.length) return new Map();
  const { data, error } = await db
    .from('dispute_escrow_links')
    .select(
      'dispute_id,escrow:escrow_transactions!inner(id,job_id,payer_id,payee_id),dispute:disputes!inner(job_id)'
    )
    .in('dispute_id', ids);
  if (error) throw error;

  const links = new Map<string, string>();
  for (const row of data ?? []) {
    const escrow = Array.isArray(row.escrow) ? row.escrow[0] : row.escrow;
    const dispute = Array.isArray(row.dispute) ? row.dispute[0] : row.dispute;
    if (
      escrow &&
      dispute &&
      escrow.job_id === dispute.job_id &&
      (actor.id === escrow.payer_id ||
        actor.id === escrow.payee_id ||
        actor.role === 'admin')
    ) {
      links.set(row.dispute_id, disputeHref(escrow.id));
    }
  }
  return links;
}

export async function resolveInboxActions(
  db: SupabaseClient,
  actor: Actor,
  rows: InboxRow[]
) {
  const contractorTargets = new Map(
    actor.role === 'contractor'
      ? rows.map((row) => [row.id, contractorAlertTarget(row)] as const)
      : []
  );
  const jobIds = [
    ...new Set(
      [...contractorTargets.values()].flatMap((target) =>
        target && target.kind !== 'funding' && !target.escrowId && target.jobId
          ? [target.jobId]
          : []
      )
    ),
  ];
  const [payments, disputeDestinations, contractorPayments] = await Promise.all(
    [
      readReviewPayments(db, rows),
      readDisputeDestinations(db, actor, rows),
      jobIds.length
        ? db
            .from('escrow_transactions')
            .select('id,job_id,status,released_at')
            .eq('payee_id', actor.id)
            .in('job_id', jobIds)
            .or('released_at.not.is.null,status.eq.disputed')
        : null,
    ]
  );
  if (contractorPayments?.error) throw contractorPayments.error;
  const authorisedPayments = payments.filter((payment) =>
    canReviewPayment(payment, actor)
  );
  return rows.map(({ approval_key, ...row }) => {
    const disputeId = row.metadata?.disputeId;
    const caseHref =
      typeof disputeId === 'string'
        ? disputeDestinations.get(disputeId)
        : undefined;
    const target = contractorTargets.get(row.id);
    if (target) {
      const jobPayments =
        contractorPayments?.data?.filter(
          (payment) =>
            payment.job_id === target.jobId &&
            (target.kind === 'release'
              ? payment.released_at
              : payment.status === 'disputed')
        ) ?? [];
      const exactId = jobPayments.length === 1 ? jobPayments[0].id : undefined;
      return presentContractorAlert(
        row,
        target,
        caseHref ??
          (target.kind === 'dispute' && !target.escrowId && exactId
            ? disputeHref(exactId)
            : undefined),
        target.kind === 'release' ? (target.escrowId ?? exactId) : undefined
      );
    }
    if (caseHref) return { ...row, action_url: caseHref, link: caseHref };
    if (!approval_key) return resolveVisitAlert(row, actor.role);

    const related = authorisedPayments.filter(
      (payment) =>
        approval_key === `job:${payment.job_id}` ||
        approval_key === `escrow:${payment.id}`
    );
    const disputed = related.some((payment) => {
      const job = Array.isArray(payment.job) ? payment.job[0] : payment.job;
      return payment.status === 'disputed' || job?.status === 'disputed';
    });
    const available = !disputed && related.some(reviewIsAvailable);
    const jobHref = related[0] ? `/jobs/${related[0].job_id}` : undefined;
    if (available) return { ...row, action_url: jobHref, link: jobHref };
    return {
      ...row,
      title: 'Work approval reminder',
      action_status: 'no_longer_actionable' as const,
      message: disputed
        ? 'Payment release is paused while the dispute is reviewed.'
        : 'The approval action is no longer available.',
      action_url: jobHref,
      link: jobHref,
    };
  });
}

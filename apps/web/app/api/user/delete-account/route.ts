import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkDeleteAccountRateLimit } from '@/lib/rate-limiting/admin-gdpr';
import { validateRequest } from '@/lib/validation/validator';
import { InternalServerError } from '@/lib/errors/api-error';
import {
  runAccountDeletionCleanup,
  getAccountDeletionStatus,
} from '@/lib/services/account/AccountDeletionRecoveryService';
import { z } from 'zod';

const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE'),
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/user/delete-account — GDPR Right to Erasure (HARD delete).
 *
 * Deletes eligible account data. Signed contract evidence is archived before
 * contract cascades. Provider cleanup is durably queued; financial retention
 * remains separate remediation work.
 *
 * Sprint 7 (1.6): narrowed sibling endpoint DELETE /api/account/delete
 * to a "deactivate" (soft-delete only — sets deleted_at). Call this one
 * for irreversible GDPR erasure. Idempotent on an already-soft-deleted
 * profile (still hard-deletes it).
 */
export const maxDuration = 60;

export const POST = withApiHandler(
  { rateLimit: false },
  async (request, { user }) => {
    // Custom GDPR rate limiting — max 1 deletion per day
    const rateLimitResponse = await checkDeleteAccountRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const validation = await validateRequest(request, deleteAccountSchema);
    if (validation instanceof NextResponse) return validation;

    // 2026-05-23 audit P1: refuse deletion while the user has active
    // marketplace state. Previously the route hard-deleted unconditionally
    // — held escrow rows would vanish (money in limbo), in-progress jobs
    // would lose their contractor mid-work, signed contracts had no
    // resolution path. Force the user to settle these first.
    // 2026-05-23 audit-15 P1: previously this only blocked status='held'
    // — but the live CHECK constraint (escrow_transactions_status_check,
    // verified 2026-05-23 via pg_constraint) allows 'pending',
    // 'release_pending', 'awaiting_homeowner_approval', and
    // 'pending_review' as additional in-flight states. A user in any
    // of those buckets has money mid-flight and the counter-party still
    // has expectations; account deletion would leave the payment
    // orphaned. Block on the full non-terminal set. Terminal/safe
    // statuses (released, refunded, failed, cancelled, completed) stay
    // unblocked.
    const ESCROW_ACTIVE_STATUSES = [
      'pending',
      'held',
      'release_pending',
      'awaiting_homeowner_approval',
      'pending_review',
    ];
    // 2026-05-27 audit-86 P2: "funded or resolvable" escrow set. The
    // signed-unfunded blocker below considers any of these as evidence
    // that the contract has a working payment path. The previous gate
    // used `.is('jobs.escrow_transactions.status', null)` which only
    // matched accepted contracts with NO escrow row — so an accepted
    // contract whose ALL escrow attempts ended in failed / refunded /
    // cancelled silently fell through and let the user hard-delete
    // despite still having a signed commitment. Include the active +
    // terminal-good statuses; absence of any of these = unfunded.
    const ESCROW_FUNDED_OR_DONE = [
      ...ESCROW_ACTIVE_STATUSES,
      'released',
      'completed',
    ];

    // A payer has no homeowner/contractor role on the contract row, so the
    // party-scoped contract query below cannot see contracts they fund.
    // Fetch those accepted contracts through the linked job relationship.
    const payerAcceptedContractsPromise =
      user.role === 'homeowner'
        ? serverSupabase
            .from('contracts')
            .select(
              'id, jobs!inner(id, payer_user_id, escrow_transactions(status))'
            )
            .eq('jobs.payer_user_id', user.id)
            .eq('status', 'accepted')
        : Promise.resolve({ data: [] as unknown[], error: null });

    const [
      { count: activeEscrowCount, error: activeEscrowError },
      { count: activeAsHomeownerCount, error: activeHomeownerJobsError },
      { count: activeAsContractorCount, error: activeContractorJobsError },
      { count: openDisputesCount, error: openDisputesError },
      { data: acceptedContractsRows, error: acceptedContractsError },
      { data: payerAcceptedContractsRows, error: payerAcceptedContractsError },
    ] = await Promise.all([
      serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
        .in('status', ESCROW_ACTIVE_STATUSES),
      serverSupabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        // A designated payer is an active marketplace participant too. Do
        // not allow account deletion while a job they are responsible for
        // funding is still assigned or in progress.
        .or(`homeowner_id.eq.${user.id},payer_user_id.eq.${user.id}`)
        .in('status', ['assigned', 'in_progress']),
      serverSupabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('contractor_id', user.id)
        .in('status', ['assigned', 'in_progress']),
      // 2026-05-23 audit P1 follow-up: open disputes are a hard blocker
      // — the counter-party hasn't had their day yet, deleting the
      // disputant would close the case in their favour by default.
      serverSupabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .or(`raised_by.eq.${user.id},against.eq.${user.id}`)
        .not('status', 'in', '("resolved","closed")'),
      // Signed contracts without a healthy escrow row. We fetch the
      // accepted contracts + their embedded escrow_transactions
      // statuses and filter client-side because PostgREST's `.is(...,
      // null)` only matches the "no row at all" case, not "row exists
      // but is failed/refunded/cancelled" (see audit-86 P2).
      serverSupabase
        .from('contracts')
        .select('id, jobs!inner(id, escrow_transactions(status))')
        .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`)
        .eq('status', 'accepted'),
      payerAcceptedContractsPromise,
    ]);

    const verificationErrors = [
      activeEscrowError,
      activeHomeownerJobsError,
      activeContractorJobsError,
      openDisputesError,
      acceptedContractsError,
      payerAcceptedContractsError,
    ].filter(Boolean);
    if (verificationErrors.length > 0) {
      logger.error(
        'Account deletion safety checks failed; refusing to delete account',
        verificationErrors[0],
        { service: 'user', userId: user.id }
      );
      throw new InternalServerError(
        'Unable to verify account state. Please try again.'
      );
    }

    type AcceptedContractRow = {
      id: string;
      jobs:
        | { escrow_transactions: Array<{ status: string | null }> | null }
        | Array<{
            escrow_transactions: Array<{ status: string | null }> | null;
          }>
        | null;
    };
    const acceptedContractRows = [
      ...((acceptedContractsRows as AcceptedContractRow[] | null) ?? []),
      ...((payerAcceptedContractsRows as AcceptedContractRow[] | null) ?? []),
    ];
    const signedUnfundedContractsCount = acceptedContractRows.filter((row) => {
      const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
      const escrows = job?.escrow_transactions ?? [];
      // unfunded iff NONE of the escrow rows are in the funded-or-done set
      return !escrows.some(
        (e) => e.status != null && ESCROW_FUNDED_OR_DONE.includes(e.status)
      );
    }).length;

    const blockers: { code: string; message: string; count: number }[] = [];
    if ((activeEscrowCount ?? 0) > 0) {
      blockers.push({
        code: 'ACTIVE_ESCROW',
        count: activeEscrowCount ?? 0,
        message: `${activeEscrowCount} escrow payment(s) are still in flight (held, pending, awaiting approval, release pending, or under review). Settle them — release, refund, cancel, or resolve the review — before deleting your account.`,
      });
    }
    if ((activeAsHomeownerCount ?? 0) > 0) {
      blockers.push({
        code: 'ACTIVE_JOBS_HOMEOWNER',
        count: activeAsHomeownerCount ?? 0,
        message: `${activeAsHomeownerCount} of your jobs are assigned or in progress. Cancel or complete them before deleting your account.`,
      });
    }
    if ((activeAsContractorCount ?? 0) > 0) {
      blockers.push({
        code: 'ACTIVE_JOBS_CONTRACTOR',
        count: activeAsContractorCount ?? 0,
        message: `You are the assigned contractor on ${activeAsContractorCount} active job(s). Withdraw from them (with the homeowner's agreement) before deleting your account.`,
      });
    }
    if ((openDisputesCount ?? 0) > 0) {
      blockers.push({
        code: 'OPEN_DISPUTES',
        count: openDisputesCount ?? 0,
        message: `${openDisputesCount} open dispute(s) involve your account. Wait for resolution (or withdraw the dispute) before deleting.`,
      });
    }
    if (signedUnfundedContractsCount > 0) {
      blockers.push({
        code: 'SIGNED_UNFUNDED_CONTRACTS',
        count: signedUnfundedContractsCount,
        // 2026-05-27 audit-86 P2: the count now also covers accepted
        // contracts whose only escrow rows are failed / refunded /
        // cancelled — those used to slip past because the previous
        // PostgREST filter (`is(...,null)`) only caught the "no row"
        // case. Either retry the payment or void the contract.
        message: `${signedUnfundedContractsCount} signed contract(s) have no working escrow yet. Fund (or retry payment) or void them before deleting your account.`,
      });
    }

    if (blockers.length > 0) {
      logger.warn('Account deletion blocked by active marketplace state', {
        service: 'user',
        userId: user.id,
        blockers: blockers.map((b) => b.code),
      });
      return NextResponse.json(
        {
          error: 'Account deletion is blocked by active marketplace state.',
          blockers,
          help: 'Resolve each blocker listed and try again. If you need help, contact support.',
        },
        { status: 409 }
      );
    }

    // Snapshot cleanup identifiers and erase eligible data in one database transaction.
    // The journal survives profile deletion and is consumed by the same worker used by cron.
    const { data: operationId, error: deleteError } = await serverSupabase.rpc(
      'delete_account_with_recovery',
      { p_user_id: user.id }
    );
    if (deleteError || typeof operationId !== 'string') {
      logger.error('Account data deletion failed', {
        service: 'user',
        userId: user.id,
        code: deleteError?.code,
      });
      throw new InternalServerError(
        'Account deletion could not be completed. Please try again or contact support.'
      );
    }
    let status: 'completed' | 'pending' | 'needs_review' = 'pending';
    try {
      await runAccountDeletionCleanup({
        operationId,
        maxSteps: 3,
        budgetMs: 25000,
      });
      status = await getAccountDeletionStatus(operationId);
    } catch {
      // Even a lost provider/database response is recoverable from the committed journal.
      logger.error('Account cleanup remains pending', {
        service: 'user',
        operationId,
      });
    }
    const completed = status === 'completed';
    return NextResponse.json(
      {
        success: completed,
        status,
        requestId: operationId,
        message: completed
          ? 'Account deleted. Signed contract evidence is retained with restricted access where applicable.'
          : status === 'needs_review'
            ? 'Your profile has been removed. Some account cleanup requires support review. Keep this request reference.'
            : 'Your profile has been removed. Login removal or subscription cancellation is still processing and will be retried automatically.',
      },
      { status: completed ? 200 : 202 }
    );
  }
);

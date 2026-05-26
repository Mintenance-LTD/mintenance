import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkDeleteAccountRateLimit } from '@/lib/rate-limiting/admin-gdpr';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { validateRequest } from '@/lib/validation/validator';
import { InternalServerError } from '@/lib/errors/api-error';
import { stripe } from '@/lib/services/subscription/stripe-client';
import { z } from 'zod';

const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE'),
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/user/delete-account — GDPR Right to Erasure (HARD delete).
 *
 * Deletes user account AND all associated data (messages / bids / jobs /
 * properties / payment history where legally permitted to drop).
 *
 * Sprint 7 (1.6): narrowed sibling endpoint DELETE /api/account/delete
 * to a "deactivate" (soft-delete only — sets deleted_at). Call this one
 * for irreversible GDPR erasure. Idempotent on an already-soft-deleted
 * profile (still hard-deletes it).
 */
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
    const [
      { count: activeEscrowCount },
      { count: activeAsHomeownerCount },
      { count: activeAsContractorCount },
      { count: openDisputesCount },
      { count: signedUnfundedContractsCount },
    ] = await Promise.all([
      serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
        .in('status', ESCROW_ACTIVE_STATUSES),
      serverSupabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('homeowner_id', user.id)
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
      // Signed contracts with no escrow held yet — the contract is
      // committed but the funding step hasn't happened. Deleting either
      // party here leaves a dangling commitment.
      serverSupabase
        .from('contracts')
        .select(
          'id, job_id, jobs!inner(id, status, escrow_transactions(status))',
          { count: 'exact', head: true }
        )
        .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .is('jobs.escrow_transactions.status', null),
    ]);

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
    if ((signedUnfundedContractsCount ?? 0) > 0) {
      blockers.push({
        code: 'SIGNED_UNFUNDED_CONTRACTS',
        count: signedUnfundedContractsCount ?? 0,
        message: `${signedUnfundedContractsCount} signed contract(s) have no escrow yet. Fund or void them before deleting your account.`,
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

    // 2026-05-27 audit-68 P1: reordered Stripe cancellation to AFTER
    // delete_user_data succeeds, and snapshot the subscription ids
    // BEFORE the DB delete (the cascade wipes contractor_subscriptions
    // + homeowner_subscriptions along with the profile, so we'd lose
    // the stripe_subscription_id link otherwise).
    //
    // Previous order (Stripe → DB) had a destructive failure mode:
    // if delete_user_data tripped a FK constraint (e.g. an audit-style
    // NOT NULL pointer surfaced from a new code path — see audit-68 P1
    // for the four columns we just nullified in v5), the user kept
    // their account but lost the Stripe billing linkage entirely. New
    // order (DB → Stripe → auth.users) keeps Stripe live until the DB
    // commits, so a DB failure is fully recoverable: the user can
    // retry, their subscription is still billing, no money in limbo.
    //
    // Failure modes under the new ordering:
    //   - delete_user_data fails → return 500, nothing else touched.
    //     User can retry; Stripe still billing.
    //   - Stripe cancel fails AFTER successful DB delete → return 500
    //     with a "data is gone but billing may continue" message so
    //     the user contacts support. Operator manually cancels the
    //     orphan Stripe subscription via the dashboard using the
    //     snapshot ids we logged. Rare (Stripe ~99.99% uptime), and
    //     the worst case is a few extra days of billing vs the
    //     previous worst case of losing the entire subscription link.
    //   - auth.users delete fails → existing behaviour (return 500
    //     with caveat; orphan credential needs operator cleanup).
    const [contractorSubsRes, homeownerSubsRes] = await Promise.all([
      serverSupabase
        .from('contractor_subscriptions')
        .select('id, stripe_subscription_id, status')
        .eq('contractor_id', user.id),
      serverSupabase
        .from('homeowner_subscriptions')
        .select('id, stripe_subscription_id, status')
        .eq('homeowner_id', user.id),
    ]);

    const subscriptionIds = [
      ...(contractorSubsRes.data ?? []),
      ...(homeownerSubsRes.data ?? []),
    ]
      .map((s) => s.stripe_subscription_id as string | null)
      .filter((id): id is string => !!id);

    // Log the deletion request for GDPR compliance.
    //
    // audit-76 follow-up Suggestion #8: capture the insert error so a
    // silent audit-log failure is observable. Don't block the
    // deletion (audit-log gap shouldn't trap a user mid-erasure) but
    // surface it loudly so we can reconcile manually via the
    // operator's audit dashboard.
    const { error: auditError } = await serverSupabase
      .from('gdpr_audit_log')
      .insert({
        user_id: user.id,
        action: 'data_deletion',
        table_name: 'users',
        record_id: user.id,
        performed_by: user.id,
      });
    if (auditError) {
      logger.warn('Failed to write gdpr_audit_log for deletion request', {
        service: 'user',
        userId: user.id,
        code: auditError.code,
        message: auditError.message,
      });
    }

    // Delete user data first. If the RPC errors we surface a 500 and
    // Stripe is still live — the user can retry or contact support
    // without losing their subscription. The fallback that the old
    // version ran here is gone; partial failures are not OK.
    const { error: deleteError } = await serverSupabase.rpc(
      'delete_user_data',
      { p_user_id: user.id }
    );

    if (deleteError) {
      logger.error('delete_user_data RPC failed', deleteError, {
        service: 'user',
        userId: user.id,
        code: deleteError.code,
        details: deleteError.details,
      });
      throw new InternalServerError(
        `Account deletion failed inside the database (${deleteError.message}). Your data has not been removed and your subscription billing is unchanged — please contact support so we can clear any FK constraint blocking the deletion.`
      );
    }

    // DB delete succeeded — now cancel the Stripe subscriptions we
    // snapshot above. resource_missing / 404 errors are tolerated
    // (already-cancelled is the desired terminal state). Any other
    // failure is logged + collected so we can surface them at the
    // end with a "data deleted but billing may continue" message
    // instead of pretending success.
    const stripeFailures: { id: string; message: string }[] = [];
    for (const subId of subscriptionIds) {
      try {
        await stripe.subscriptions.cancel(subId);
        logger.info('Cancelled Stripe subscription after account delete', {
          service: 'user',
          userId: user.id,
          subscriptionId: subId,
        });
      } catch (err) {
        const stripeErr = err as {
          code?: string;
          message?: string;
          statusCode?: number;
        };
        if (
          stripeErr?.code === 'resource_missing' ||
          stripeErr?.statusCode === 404
        ) {
          logger.warn(
            'Stripe subscription already cancelled/missing, skipping',
            {
              service: 'user',
              userId: user.id,
              subscriptionId: subId,
            }
          );
          continue;
        }
        logger.error('Stripe subscription cancellation failed', err, {
          service: 'user',
          userId: user.id,
          subscriptionId: subId,
        });
        stripeFailures.push({
          id: subId,
          message: stripeErr?.message ?? 'unknown error',
        });
      }
    }

    // 2026-05-23 (v2): drop the auth.users row so the credential stops
    // working. public.profiles does NOT have an ON DELETE CASCADE FK to
    // auth.users (verified via information_schema query 2026-05-23) so
    // these two deletions are independent — both must succeed for the
    // account to actually be gone.
    //
    // Previous version logged the failure but returned success anyway.
    // That left the user able to log back in after a "successful"
    // deletion (only public data was gone). Now this is a hard failure
    // — if auth.users deletion errors, we return 500 with an explicit
    // message so the caller (modal / settings UI) can show the user
    // what happened. The data is already gone at this point; an
    // operator follow-up is needed to remove the orphan auth row.
    let authDeleteFailed = false;
    let authDeleteErrMsg: string | undefined;
    try {
      const { error: authDeleteError } =
        await serverSupabase.auth.admin.deleteUser(user.id);
      if (authDeleteError) {
        authDeleteFailed = true;
        authDeleteErrMsg = authDeleteError.message;
        logger.error(
          'Failed to delete auth.users row after data deletion',
          authDeleteError,
          { userId: user.id }
        );
      } else {
        logger.info('Auth user deleted', { userId: user.id });
      }
    } catch (error) {
      authDeleteFailed = true;
      authDeleteErrMsg = error instanceof Error ? error.message : String(error);
      logger.error('auth.admin.deleteUser threw', error, { userId: user.id });
    }

    // SECURITY: Blacklist all tokens for this user. Runs even when
    // auth.users deletion failed so any in-flight sessions are
    // invalidated immediately — that at least keeps the orphan
    // credential from being usable until an operator cleans up.
    try {
      await tokenBlacklist.blacklistUserTokens(user.id);
      logger.info('User tokens blacklisted after account deletion', {
        userId: user.id,
      });
    } catch (error) {
      logger.error('Failed to blacklist user tokens after deletion', error, {
        userId: user.id,
      });
    }

    if (authDeleteFailed) {
      // 2026-05-23: data is gone but the credential survives. The user
      // would otherwise see "Account deleted successfully" and still be
      // able to sign in. Surface the failure so they know — and so we
      // see it in monitoring instead of silently leaving orphan rows.
      throw new InternalServerError(
        `Account data was deleted but the login credential could not be removed${
          authDeleteErrMsg ? ` (${authDeleteErrMsg})` : ''
        }. Please contact support — your data is gone but you may still be able to sign in until an operator clears the credential.`
      );
    }

    // 2026-05-27 audit-68 P1: Stripe failures collected during the
    // reordered cancellation block surface here. Data is gone, auth
    // credential is gone — but if any Stripe sub failed to cancel,
    // billing continues until ops manually cancels via the dashboard.
    // Return 500 with the sub ids so the user (and our logs) know.
    if (stripeFailures.length > 0) {
      throw new InternalServerError(
        `Account data and credentials were deleted, but ${stripeFailures.length} Stripe subscription(s) could not be cancelled — billing may continue until support intervenes. Please contact support with these references: ${stripeFailures.map((f) => f.id).join(', ')}.`
      );
    }

    logger.info('User account deleted', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  }
);

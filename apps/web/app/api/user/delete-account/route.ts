import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkDeleteAccountRateLimit } from '@/lib/rate-limiting/admin-gdpr';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { validateRequest } from '@/lib/validation/validator';
import { InternalServerError } from '@/lib/errors/api-error';
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

    // Log the deletion request for GDPR compliance
    await serverSupabase.from('gdpr_audit_log').insert({
      user_id: user.id,
      action: 'data_deletion',
      table_name: 'users',
      record_id: user.id,
      performed_by: user.id,
    });

    // Delete user data using the role-aware GDPR function (live since
    // 20260523000003 — handles contractor jobs by unassigning rather
    // than deleting, and clears RESTRICT/NO ACTION FK dependants
    // before the jobs DELETE in the homeowner branch). The previous
    // version of this route ran a non-transactional manual fallback
    // when the RPC errored — that hid partial failures (jobs left
    // behind, profile not deleted) under a misleading "success"
    // response. The fallback is gone; if the RPC errors we surface
    // it as a 500 so the user (and our logs) see the real problem
    // rather than a half-deleted account.
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
        `Account deletion failed inside the database (${deleteError.message}). Your data has not been removed — please contact support so we can clear any FK constraint blocking the deletion.`
      );
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

    logger.info('User account deleted', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  }
);

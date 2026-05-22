import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkDeleteAccountRateLimit } from '@/lib/rate-limiting/admin-gdpr';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { validateRequest } from '@/lib/validation/validator';
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

    // Delete user data using the GDPR function (if available)
    const { error: deleteError } = await serverSupabase.rpc(
      'delete_user_data',
      {
        p_user_id: user.id,
      }
    );

    if (deleteError) {
      // Fallback: Manual deletion if function doesn't exist
      logger.warn('GDPR delete function not available, using manual deletion', {
        service: 'user',
        error: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
      });

      // Delete in order respecting foreign key constraints
      await serverSupabase
        .from('messages')
        .delete()
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      await serverSupabase.from('bids').delete().eq('contractor_id', user.id);
      await serverSupabase
        .from('jobs')
        .delete()
        .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`);
      await serverSupabase.from('properties').delete().eq('owner_id', user.id);
      await serverSupabase.from('profiles').delete().eq('id', user.id);
    }

    // 2026-05-23: previously this endpoint deleted public.profiles + related
    // tables but left the auth.users row intact, so the user could sign back
    // in with their original credentials immediately. Drop the auth row
    // too so the credential stops working. Uses the service-role client's
    // admin API (serverSupabase is constructed with SUPABASE_SERVICE_ROLE_KEY
    // — see lib/api/supabaseServer.ts).
    try {
      const { error: authDeleteError } =
        await serverSupabase.auth.admin.deleteUser(user.id);
      if (authDeleteError) {
        // Don't fail the request — the profile + data are already gone,
        // and the token blacklist below will still revoke active sessions.
        // The orphaned auth row can be cleaned up by an admin.
        logger.error(
          'Failed to delete auth.users row after data deletion',
          authDeleteError,
          { userId: user.id }
        );
      } else {
        logger.info('Auth user deleted', { userId: user.id });
      }
    } catch (error) {
      logger.error('auth.admin.deleteUser threw', error, { userId: user.id });
    }

    // SECURITY: Blacklist all tokens for this user
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

    logger.info('User account deleted', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  }
);

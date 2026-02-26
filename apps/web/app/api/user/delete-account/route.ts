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
 * POST /api/user/delete-account
 * Delete user account and all associated data (GDPR Right to Erasure)
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
    const { error: deleteError } = await serverSupabase.rpc('delete_user_data', {
      p_user_id: user.id,
    });

    if (deleteError) {
      // Fallback: Manual deletion if function doesn't exist
      logger.warn('GDPR delete function not available, using manual deletion', {
        service: 'user',
        error: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
      });

      // Delete in order respecting foreign key constraints
      await serverSupabase.from('messages').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      await serverSupabase.from('bids').delete().eq('contractor_id', user.id);
      await serverSupabase.from('jobs').delete().or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`);
      await serverSupabase.from('properties').delete().eq('owner_id', user.id);
      await serverSupabase.from('profiles').delete().eq('id', user.id);
    }

    // SECURITY: Blacklist all tokens for this user
    try {
      await tokenBlacklist.blacklistUserTokens(user.id);
      logger.info('User tokens blacklisted after account deletion', { userId: user.id });
    } catch (error) {
      logger.error('Failed to blacklist user tokens after deletion', error, { userId: user.id });
    }

    logger.info('User account deleted', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  }
);

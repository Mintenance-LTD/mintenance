import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  ForbiddenError,
  BadRequestError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';

/**
 * DELETE /api/account/delete — SOFT delete (deactivate).
 *
 * Sprint 7 (1.6): explicitly narrowed to "deactivate" semantics. This
 * endpoint ONLY sets `deleted_at` + anonymizes the email. It does NOT
 * remove jobs / bids / messages / payment history — users who need full
 * GDPR-style erasure should call POST /api/user/delete-account instead
 * (that endpoint runs `delete_user_data()` RPC which cascades across the
 * data model).
 *
 * Previously a single user could hit both endpoints and end up with a
 * half-deleted profile whose soft-delete timestamp lived on top of hard-
 * deleted dependents. Now:
 *  - If the account is already soft-deleted, this endpoint 400s.
 *  - Clients that want full erasure see the `next_step` field in the
 *    response pointing at the hard-delete endpoint.
 *  - The hard-delete endpoint still handles soft-deleted profiles
 *    (it deletes unconditionally).
 */
const accountDeleteSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  confirmation: z.literal('DELETE'),
});

export const DELETE = withApiHandler(
  {},
  async (request, { user }) => {
    const validation = await validateRequest(request, accountDeleteSchema);
    if (validation instanceof NextResponse) return validation;
    const { data } = validation;

    if (data.userId !== user.id) {
      throw new ForbiddenError('You can only deactivate your own account');
    }

    const { data: existingUser, error: fetchError } = await serverSupabase
      .from('profiles')
      .select('id, deleted_at')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      logger.error('Error fetching user for deactivation', {
        userId: user.id,
        error: fetchError.message,
      });
      throw new InternalServerError('Failed to verify account status');
    }

    if (existingUser?.deleted_at) {
      // Sprint 7 (1.6): reject rather than double-process. Route users to
      // the hard-delete endpoint if they want full erasure.
      throw new BadRequestError(
        'Account is already deactivated. To permanently delete your data (GDPR erasure), use POST /api/user/delete-account.'
      );
    }

    const { error: deleteError } = await serverSupabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        email: `deleted_${Date.now()}_${user.email}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (deleteError) {
      logger.error('Error deleting user account', { userId: user.id, error: deleteError.message });
      throw new InternalServerError('Failed to delete account. Please try again.');
    }

    logger.info('User account deactivated (soft delete)', { userId: user.id });

    return NextResponse.json({
      message: 'Account deactivated. Your profile is hidden but your data is retained.',
      deactivated: true,
      next_step:
        'To permanently delete your account and erase all data (GDPR erasure), call POST /api/user/delete-account.',
    });
  }
);

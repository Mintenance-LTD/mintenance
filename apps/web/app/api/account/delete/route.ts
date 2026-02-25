import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';

const accountDeleteSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  confirmation: z.literal('DELETE'),
});

/**
 * DELETE /api/account/delete
 * Soft deletes a user account by setting deleted_at timestamp.
 */
export const DELETE = withApiHandler(
  {},
  async (request, { user }) => {
    const validation = await validateRequest(request, accountDeleteSchema);
    if (validation instanceof NextResponse) return validation;
    const { data } = validation;

    if (data.userId !== user.id) {
      throw new ForbiddenError('You can only delete your own account');
    }

    const { data: existingUser, error: fetchError } = await serverSupabase
      .from('profiles')
      .select('id, deleted_at')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      logger.error('Error fetching user for deletion', { userId: user.id, error: fetchError.message });
      throw new InternalServerError('Failed to verify account status');
    }

    if (existingUser?.deleted_at) {
      throw new BadRequestError('Account is already deleted');
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

    logger.info('User account deleted', { userId: user.id });

    return NextResponse.json({ message: 'Account deleted successfully', deleted: true });
  }
);

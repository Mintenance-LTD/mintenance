import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { clearAuthCookie } from '@/lib/auth';
import {
  ForbiddenError,
  BadRequestError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';

/** Deactivate the account and revoke its web sessions while retaining its records. */
const accountDeleteSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  confirmation: z.literal('DELETE'),
});

export const DELETE = withApiHandler({}, async (request, { user }) => {
  const validation = await validateRequest(request, accountDeleteSchema);
  if (validation instanceof NextResponse) return validation;
  const { data } = validation;

  if (data.userId !== user.id) {
    throw new ForbiddenError('You can only deactivate your own account');
  }

  const { data: deactivated, error } = await serverSupabase.rpc(
    'deactivate_account_and_revoke_sessions',
    { p_user_id: user.id }
  );
  if (error) {
    logger.error('Could not deactivate account', {
      userId: user.id,
      error: error.message,
    });
    throw new InternalServerError(
      'Account deactivation could not be confirmed.'
    );
  }
  await clearAuthCookie();
  if (deactivated !== true) {
    throw new BadRequestError(
      'This account is already deactivated. See the Privacy Policy to request erasure.'
    );
  }

  logger.info('User account deactivated (soft delete)', { userId: user.id });

  return NextResponse.json({
    message:
      'Account deactivated. Your data is retained until erasure is requested.',
    deactivated: true,
    next_step:
      'To request erasure after deactivation, use the contact details in the Privacy Policy.',
    privacy_url: '/privacy',
  });
});

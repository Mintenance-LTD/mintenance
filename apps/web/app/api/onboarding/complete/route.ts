import { NextResponse } from 'next/server';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * POST /api/onboarding/complete - mark onboarding as complete.
 */
export const POST = withApiHandler({}, async (_request, { user }) => {
  const success = await OnboardingService.markOnboardingComplete(user.id);

  if (!success) {
    throw new InternalServerError('Failed to mark onboarding as complete');
  }

  logger.info('Onboarding completed', {
    service: 'onboarding',
    userId: user.id,
    role: user.role,
  });

  return NextResponse.json({ success: true, message: 'Onboarding marked as complete' });
});

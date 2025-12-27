import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, InternalServerError } from '@/lib/errors/api-error';

export async function POST(request: NextRequest) {
  try {

    // CSRF protection
    await requireCSRF(request);
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to complete onboarding');
    }

    const success = await OnboardingService.markOnboardingComplete(user.id);

    if (!success) {
      throw new InternalServerError('Failed to mark onboarding as complete');
    }

    logger.info('Onboarding completed', {
      service: 'onboarding',
      userId: user.id,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding marked as complete',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}


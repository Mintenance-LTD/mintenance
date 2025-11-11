import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await OnboardingService.markOnboardingComplete(user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to mark onboarding as complete' },
        { status: 500 }
      );
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
    logger.error('Unexpected error completing onboarding', {
      service: 'onboarding',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


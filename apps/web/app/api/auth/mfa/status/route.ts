import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromHeaders } from '@/lib/auth';
import { MFAService } from '@/lib/mfa/mfa-service';
import { logger } from '@mintenance/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/mfa/status
 * Get MFA status for current user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current user from headers (set by middleware)
    const user = getCurrentUserFromHeaders(request.headers);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get MFA status
    const mfaStatus = await MFAService.getMFAStatus(user.id);

    return NextResponse.json({
      success: true,
      data: mfaStatus,
    });
  } catch (error) {
    logger.error('Failed to get MFA status', error, {
      service: 'mfa',
    });

    return NextResponse.json(
      { error: 'Failed to get MFA status' },
      { status: 500 }
    );
  }
}

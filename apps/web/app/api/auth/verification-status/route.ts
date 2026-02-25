import { NextResponse } from 'next/server';
import { HomeownerVerificationService } from '@/lib/services/verification/HomeownerVerificationService';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/auth/verification-status - check current user's verification status.
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 5 } },
  async (_request, { user }) => {
    const status = await HomeownerVerificationService.getVerificationStatus(user.id);
    return NextResponse.json(status);
  }
);

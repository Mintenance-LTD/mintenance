import { NextResponse } from 'next/server';
import { MFAService } from '@/lib/mfa/mfa-service';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/mfa/status - get MFA status for current user.
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 5 } },
  async (_request, { user }) => {
    const mfaStatus = await MFAService.getMFAStatus(user.id);
    return NextResponse.json({ success: true, data: mfaStatus });
  },
);

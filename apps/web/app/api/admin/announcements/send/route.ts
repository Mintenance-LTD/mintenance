import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
export const POST = withApiHandler(
  { roles: ['admin'], requireMfaVerifiedWithinMinutes: 15 },
  async () =>
    NextResponse.json(
      {
        error: {
          message: 'Use Customer service to preview and send notifications.',
          code: 'USE_CUSTOMER_SERVICE',
        },
        actionUrl: '/admin/support',
      },
      { status: 410 }
    )
);

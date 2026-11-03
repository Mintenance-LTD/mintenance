import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AdminCommunicationService } from '@/lib/services/admin/AdminCommunicationService';

/**
 * GET /api/admin/announcements
 * List all announcements with pagination
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const publishedOnly =
      request.nextUrl.searchParams.get('publishedOnly') === 'true';
    const limit = parseInt(
      request.nextUrl.searchParams.get('limit') || '50',
      10
    );
    const offset = parseInt(
      request.nextUrl.searchParams.get('offset') || '0',
      10
    );

    const { announcements, total } =
      await AdminCommunicationService.getAllAnnouncements({
        publishedOnly,
        limit,
        offset,
      });

    return NextResponse.json({ announcements, total });
  }
);

/**
 * POST /api/admin/announcements
 * Create a new announcement
 */
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

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';

/**
 * PUT /api/admin/announcements/[id]
 * Update an announcement
 */
export const PUT = withApiHandler(
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

/**
 * DELETE /api/admin/announcements/[id]
 * Delete an announcement
 */
export const DELETE = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    // Mass-deleting platform announcements would erase audit trail;
    // demand fresh MFA proof.
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request, { user, params }) => {
    const { id } = params;

    const { error } = await serverSupabase
      .from('admin_announcements')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting announcement', { error: error.message, id });
      throw new InternalServerError('Failed to delete announcement');
    }

    await AdminActivityLogger.logFromRequest(
      request,
      user.id,
      'delete_announcement',
      'communication',
      `Deleted announcement: ${id}`,
      'announcement',
      id
    );

    return NextResponse.json({ success: true });
  }
);

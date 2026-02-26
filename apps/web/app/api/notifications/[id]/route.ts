import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';

/**
 * DELETE /api/notifications/[id]
 *
 * Deletes a notification by ID.
 * Security: auth + ownership check via withApiHandler.
 */
export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const { id } = params;

    if (!id) {
      throw new BadRequestError('Notification ID is required');
    }

    // Verify notification belongs to user before deleting
    const { data: notification, error: fetchError } = await serverSupabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.user_id !== user.id) {
      throw new ForbiddenError('You do not have permission to delete this notification');
    }

    // Delete notification
    const { error: deleteError } = await serverSupabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      logger.error('Error deleting notification', deleteError, {
        service: 'notifications',
        userId: user.id,
        notificationId: id,
      });
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  },
);

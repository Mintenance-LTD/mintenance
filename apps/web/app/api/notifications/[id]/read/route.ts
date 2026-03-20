import { NextResponse } from 'next/server';
import { serverSupabase, createRequestScopedClient } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (request, { user, params }) => {
    const { id } = params;

    // Use RLS-enforced client for user-scoped operations; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // Verify notification belongs to user
    const { data: notification, error: fetchError } = await userDb
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.user_id !== user.id) {
      throw new ForbiddenError('You do not have permission to modify this notification');
    }

    // Mark as read
    const { error: updateError } = await userDb
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (updateError) {
      logger.error('Error marking notification as read', updateError, {
        service: 'notifications',
        userId: user.id,
        notificationId: id,
      });
      throw updateError;
    }

    return NextResponse.json({ success: true });
  },
);

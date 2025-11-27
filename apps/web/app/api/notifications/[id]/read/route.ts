import { NextRequest } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { errorResponse, successResponse, ErrorCodes } from '@/lib/utils/api-response';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  await requireCSRF(request);

  try {
    const user = await getCurrentUserFromCookies();
    const { id } = await params;

    if (!user) {
      return errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
    }

    // Verify notification belongs to user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      return errorResponse('Notification not found', ErrorCodes.NOT_FOUND, 404);
    }

    if (notification.user_id !== user.id) {
      return errorResponse('Unauthorized', ErrorCodes.FORBIDDEN, 403);
    }

    // Mark as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (updateError) {
      logger.error('Error marking notification as read', updateError, {
        service: 'notifications',
        userId: user.id,
        notificationId: id,
      });
      return errorResponse(
        'Failed to mark notification as read',
        ErrorCodes.PROCESSING_ERROR,
        500,
        { notificationId: id }
      );
    }

    return successResponse({ success: true });
  } catch (error) {
    logger.error('Error in POST /api/notifications/[id]/read', error, {
      service: 'notifications',
    });
    return errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500);
  }
}

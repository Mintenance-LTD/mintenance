import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { errorResponse, successResponse, ErrorCodes } from '@/lib/utils/api-response';

/**
 * DELETE /api/notifications/[id]
 * 
 * Deletes a notification by ID.
 * Following Single Responsibility Principle - only handles notification deletion.
 * 
 * Security:
 * - Requires authentication
 * - Verifies notification belongs to authenticated user
 * - CSRF protection
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Get authenticated user
    const user = await getCurrentUserFromCookies();
    
    if (!user) {
      return errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
    }

    const { id } = await params;

    if (!id) {
      return errorResponse('Notification ID is required', ErrorCodes.VALIDATION_ERROR, 400);
    }

    // Verify notification belongs to user before deleting
    const { data: notification, error: fetchError } = await serverSupabase
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
      return errorResponse(
        'Failed to delete notification',
        ErrorCodes.PROCESSING_ERROR,
        500,
        { notificationId: id }
      );
    }

    return successResponse({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/notifications/[id]', error, {
      service: 'notifications',
    });
    return errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500);
  }
}

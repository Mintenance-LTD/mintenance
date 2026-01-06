import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

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
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    // Get authenticated user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to delete notifications');
    }

    const { id } = await params;

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
  } catch (error) {
    return handleAPIError(error);
  }
}

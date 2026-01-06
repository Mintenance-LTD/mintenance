import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * DELETE /api/account/delete
 * 
 * Soft deletes a user account by setting deleted_at timestamp.
 * This allows for account recovery if needed and maintains data integrity.
 */
export async function DELETE(request: NextRequest) {
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
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to delete account');
    }

    // Verify the user is trying to delete their own account
    const body = await request.json().catch(() => ({}));
    const { userId, confirmation } = body;

    if (!userId || userId !== user.id) {
      throw new ForbiddenError('You can only delete your own account');
    }

    if (confirmation !== 'DELETE') {
      throw new BadRequestError('Confirmation text must be "DELETE"');
    }

    // Check if account is already deleted
    const { data: existingUser, error: fetchError } = await serverSupabase
      .from('users')
      .select('id, deleted_at')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      logger.error('Error fetching user for deletion', {
        userId: user.id,
        error: fetchError.message
      });
      throw new InternalServerError('Failed to verify account status');
    }

    if (existingUser?.deleted_at) {
      throw new BadRequestError('Account is already deleted');
    }

    // Soft delete: Set deleted_at timestamp
    // This preserves data for potential recovery while marking the account as deleted
    const { error: deleteError } = await serverSupabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        email: `deleted_${Date.now()}_${user.email}`, // Anonymize email to prevent reuse
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (deleteError) {
      logger.error('Error deleting user account', {
        userId: user.id,
        error: deleteError.message
      });
      throw new InternalServerError('Failed to delete account. Please try again.');
    }

    logger.info('User account deleted', { userId: user.id });

    return NextResponse.json(
      {
        message: 'Account deleted successfully',
        deleted: true
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}


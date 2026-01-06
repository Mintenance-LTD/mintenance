import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { checkDeleteAccountRateLimit } from '@/lib/rate-limiting/admin-gdpr';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * POST /api/user/delete-account
 * Delete user account and all associated data (GDPR Right to Erasure)
 */
export async function POST(request: NextRequest) {
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

    // Rate limiting - max 1 deletion per day
    const rateLimitResponse = await checkDeleteAccountRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const body = await request.json();
    if (!body.confirm) {
      throw new BadRequestError('Account deletion must be confirmed');
    }

    // Log the deletion request for GDPR compliance
    await serverSupabase.from('gdpr_audit_log').insert({
      user_id: user.id,
      action: 'data_deletion',
      table_name: 'users',
      record_id: user.id,
      performed_by: user.id,
    });

    // Delete user data using the GDPR function (if available)
    // Otherwise, delete manually respecting foreign key constraints
    const { error: deleteError } = await serverSupabase.rpc('delete_user_data', {
      p_user_id: user.id,
    });

    if (deleteError) {
      // Fallback: Manual deletion if function doesn't exist
      logger.warn('GDPR delete function not available, using manual deletion', {
        service: 'user',
        error: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
      });
      
      // Delete in order respecting foreign key constraints
      await serverSupabase.from('messages').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      await serverSupabase.from('bids').delete().eq('contractor_id', user.id);
      await serverSupabase.from('jobs').delete().or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`);
      await serverSupabase.from('properties').delete().eq('owner_id', user.id);
      await serverSupabase.from('users').delete().eq('id', user.id);
    }

    // SECURITY: Blacklist all tokens for this user
    try {
      await tokenBlacklist.blacklistUserTokens(user.id);
      logger.info('User tokens blacklisted after account deletion', { userId: user.id });
    } catch (error) {
      logger.error('Failed to blacklist user tokens after deletion', error, { userId: user.id });
      // Continue even if blacklisting fails
    }

    logger.info('User account deleted', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}


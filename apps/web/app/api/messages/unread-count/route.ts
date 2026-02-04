import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
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

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view unread count');
    }

    const { count, error } = await serverSupabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (error) {
      logger.error('Failed to load unread count', error, {
        service: 'messages',
        userId: user.id
      });
      throw error;
    }

    logger.debug('Unread count retrieved', {
      service: 'messages',
      userId: user.id,
      count: count ?? 0
    });

    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    return handleAPIError(err);
  }
}

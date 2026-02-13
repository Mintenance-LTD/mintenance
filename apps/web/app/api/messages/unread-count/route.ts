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

    // Get message_threads where user is a participant
    const { data: userThreads } = await serverSupabase
      .from('message_threads')
      .select('id')
      .contains('participant_ids', [user.id]);

    const threadIds = (userThreads ?? []).map(t => t.id);

    let unreadCount = 0;
    if (threadIds.length > 0) {
      // Get messages not sent by user
      const { data: msgs, error } = await serverSupabase
        .from('messages')
        .select('id, read_by')
        .in('thread_id', threadIds)
        .neq('sender_id', user.id);

      if (error) {
        logger.error('Failed to load unread count', error, {
          service: 'messages',
          userId: user.id
        });
        throw error;
      }

      // Count messages where user is not in read_by
      unreadCount = (msgs ?? []).filter((m: { id: string; read_by: string[] | null }) => {
        const readBy = Array.isArray(m.read_by) ? m.read_by : [];
        return !readBy.includes(user.id);
      }).length;
    }

    return NextResponse.json({ count: unreadCount });
  } catch (err) {
    return handleAPIError(err);
  }
}

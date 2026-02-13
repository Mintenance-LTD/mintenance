import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * API endpoint to fetch notification badge counts for the sidebar
 * Used by useNotificationCounts hook
 */
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
      throw new UnauthorizedError('Authentication required to view notification counts');
    }

    // Fetch counts from database
    // For messages, we need to go through message_threads first
    const { data: userThreads } = await serverSupabase
      .from('message_threads')
      .select('id')
      .contains('participant_ids', [user.id]);

    const threadIds = (userThreads ?? []).map(t => t.id);

    let messageCount = 0;
    if (threadIds.length > 0) {
      const { data: msgs } = await serverSupabase
        .from('messages')
        .select('id, read_by')
        .in('thread_id', threadIds)
        .neq('sender_id', user.id);

      messageCount = (msgs ?? []).filter((m: { id: string; read_by: string[] | null }) => {
        const readBy = Array.isArray(m.read_by) ? m.read_by : [];
        return !readBy.includes(user.id);
      }).length;
    }

    const [
      connectionsResponse,
      quoteRequestsResponse,
      notificationsResponse,
    ] = await Promise.all([
      // Pending connections count
      serverSupabase
        .from('connections')
        .select('id', { count: 'exact' })
        .eq('contractor_id', user.id)
        .eq('status', 'pending'),

      // New quote requests count
      serverSupabase
        .from('jobs')
        .select('id', { count: 'exact' })
        .eq('contractor_id', user.id)
        .eq('status', 'open')
        .eq('quoted', false),

      // Unread notifications count
      serverSupabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('read', false),
    ]);

    const counts = {
      messages: messageCount,
      connections: connectionsResponse.count || 0,
      quoteRequests: quoteRequestsResponse.count || 0,
      notifications: notificationsResponse.count || 0,
    };

    return NextResponse.json({
      success: true,
      counts,
    });

  } catch (error) {
    return handleAPIError(error);
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * API endpoint to fetch notification badge counts for the sidebar.
 * Used by useNotificationCounts hook.
 */
export const GET = withApiHandler({}, async (_request, { user }) => {
  // Fetch unread message count across threads
  const { data: userThreads } = await serverSupabase
    .from('message_threads')
    .select('id')
    .contains('participant_ids', [user.id]);

  const threadIds = (userThreads ?? []).map((t) => t.id);

  let messageCount = 0;
  if (threadIds.length > 0) {
    const { data: msgs } = await serverSupabase
      .from('messages')
      .select('id, read_by')
      .in('thread_id', threadIds)
      .neq('sender_id', user.id);

    messageCount = (msgs ?? []).filter(
      (m: { id: string; read_by: string[] | null }) => {
        const readBy = Array.isArray(m.read_by) ? m.read_by : [];
        return !readBy.includes(user.id);
      }
    ).length;
  }

  const [connectionsResponse, quoteRequestsResponse, notificationsResponse] =
    await Promise.all([
      serverSupabase
        .from('connections')
        .select('id', { count: 'exact' })
        .eq('contractor_id', user.id)
        .eq('status', 'pending'),

      serverSupabase
        .from('jobs')
        .select('id', { count: 'exact' })
        .eq('contractor_id', user.id)
        .eq('status', 'open')
        .eq('quoted', false),

      serverSupabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('read', false),
    ]);

  return NextResponse.json({
    success: true,
    counts: {
      messages: messageCount,
      connections: connectionsResponse.count || 0,
      quoteRequests: quoteRequestsResponse.count || 0,
      notifications: notificationsResponse.count || 0,
    },
  });
});

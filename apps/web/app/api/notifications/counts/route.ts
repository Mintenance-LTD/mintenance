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

  // 2026-05-02 audit follow-up (98% readiness step 2): the `connections`
  // table was removed by supabase/migrations/007_remove_social_features.sql,
  // so the prior `.from('connections')` query was 404'ing on every poll
  // of the sidebar badge counts. Returning 0 keeps the existing frontend
  // shape stable while removing the runtime DB error. The connections
  // count field is preserved (always 0) so any consumer still reading
  // it doesn't crash on `undefined`.
  const [quoteRequestsResponse, notificationsResponse] = await Promise.all([
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

  return NextResponse.json(
    {
      success: true,
      counts: {
        messages: messageCount,
        connections: 0,
        quoteRequests: quoteRequestsResponse.count || 0,
        notifications: notificationsResponse.count || 0,
      },
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=120, must-revalidate',
      },
    }
  );
});

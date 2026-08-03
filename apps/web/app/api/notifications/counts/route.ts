import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * API endpoint to fetch notification badge counts for the sidebar.
 * Used by useNotificationCounts hook.
 */
export const GET = withApiHandler({}, async (_request, { user }) => {
  // 2026-05-23 audit P1: previously joined via message_threads.thread_id
  // and filtered `messages.read_by` array-membership. Live schema has
  // `messages` keyed by (sender_id, receiver_id, job_id) with a single
  // `read` boolean — no thread_id, no read_by. The thread_id query
  // returned 0 rows on every call, masking real unread counts.
  const { count: messageCountRaw } = await serverSupabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('read', false);
  const messageCount = messageCountRaw ?? 0;

  // 2026-05-02 audit follow-up (98% readiness step 2): the `connections`
  // table was removed by supabase/migrations/007_remove_social_features.sql,
  // so the prior `.from('connections')` query was 404'ing on every poll
  // of the sidebar badge counts. Returning 0 keeps the existing frontend
  // shape stable while removing the runtime DB error. The connections
  // count field is preserved (always 0) so any consumer still reading
  // it doesn't crash on `undefined`.
  // quoteRequests was counted with .eq('status','open').eq('quoted',false)
  // — jobs has no `quoted` column and no 'open' status, so the query ALWAYS
  // errored and the badge read 0. Pinned to an honest 0 (same treatment the
  // route already gives `connections`) until quote-requests are a real,
  // queryable concept (filter-schema audit 2026-08-02).
  const quoteRequestsResponse = { count: 0 };
  const [notificationsResponse] = await Promise.all([
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

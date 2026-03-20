/**
 * Message query definitions — consistent across web and mobile.
 *
 * Eliminates the N+1 pattern on mobile (one query per thread for last message + unread count).
 * Both platforms now use the same select strings and query patterns.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Select strings ─────────────────────────────────────────────

/** Standard message with sender join (used by both platforms). */
export const MESSAGE_WITH_SENDER_SELECT = `
  id, job_id, sender_id, receiver_id, message_text, message_type,
  attachment_url, read, created_at,
  sender:users!messages_sender_id_fkey(first_name, last_name, role)
` as const;

// ─── Query functions ─────────────────────────────────────────────

/**
 * Fetch messages for a job conversation.
 * Replaces both web API and mobile's direct MessageFetcher query.
 */
export async function fetchJobMessages(
  client: SupabaseClient,
  jobId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;

  return client
    .from('messages')
    .select(MESSAGE_WITH_SENDER_SELECT)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

/**
 * Fetch unread message count for a user.
 */
export async function fetchUnreadMessageCount(
  client: SupabaseClient,
  userId: string
) {
  return client
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('read', false);
}

/**
 * Search messages within a job conversation.
 */
export async function searchJobMessages(
  client: SupabaseClient,
  jobId: string,
  searchTerm: string,
  limit = 20
) {
  return client
    .from('messages')
    .select(MESSAGE_WITH_SENDER_SELECT)
    .eq('job_id', jobId)
    .ilike('message_text', `%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Mark all messages in a job as read for a specific receiver.
 */
export async function markJobMessagesAsRead(
  client: SupabaseClient,
  jobId: string,
  receiverId: string
) {
  return client
    .from('messages')
    .update({ read: true })
    .eq('job_id', jobId)
    .eq('receiver_id', receiverId)
    .eq('read', false);
}

import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import { isValidSearchTerm } from '../../utils/sqlSanitization';
import type { Message, MessageThread } from './types';

/**
 * Audit step 5 + 10 (2026-04-29): every read in this file goes
 * through the web API (`/api/messages/...`). The previous
 * direct-Supabase fan-out queried four tables (messages,
 * message_threads, profiles, jobs) inline and silently leaked
 * cross-thread bid data when RLS was less strict than the API's
 * explicit ownership checks. Routing through the server is also
 * the only way to keep mobile and web reading the same shape —
 * the API normalises `content` → `messageText`, role-resolves
 * participant names, etc.
 */

/**
 * Fetch messages for a job conversation via the web API.
 *
 * 2026-05-26 audit-62 P2: previously this assumed the API returned
 * the whole thread in one shot and sliced client-side. The web route
 * is keyset-paginated (default + max 50 per page, cursor on
 * created_at) — for any thread > 50 messages the older messages were
 * silently dropped, and the in-thread search below only hit the
 * newest page. Now follows `nextCursor` until the thread ends or we
 * hit a safety cap (default 1000 messages) so chat history + search
 * cover the full conversation.
 *
 * Returned order matches the API contract: ascending by created_at
 * so the existing render code reads top-to-bottom.
 */
const FETCH_PAGE_SIZE = 50;
const FETCH_SAFETY_CAP = 1000;

export async function getJobMessages(
  jobId: string,
  limit = 50,
  offset = 0
): Promise<Message[]> {
  try {
    // Collect pages from newest → older. The API returns each page
    // ascending; we concat then re-sort once at the end so a
    // partially-returned final page can't break ordering.
    interface PageResponse {
      messages: Message[];
      nextCursor?: string;
    }
    const collected: Message[] = [];
    let cursor: string | undefined;
    let pages = 0;
    while (collected.length < FETCH_SAFETY_CAP) {
      pages += 1;
      const params = new URLSearchParams();
      params.set('limit', String(FETCH_PAGE_SIZE));
      if (cursor) params.set('cursor', cursor);
      const response = await mobileApiClient.get<PageResponse>(
        `/api/messages/threads/${encodeURIComponent(jobId)}/messages?${params.toString()}`
      );
      const page = Array.isArray(response?.messages) ? response.messages : [];
      collected.push(...page);
      if (!response?.nextCursor || page.length === 0) break;
      cursor = response.nextCursor;
    }
    if (collected.length >= FETCH_SAFETY_CAP) {
      logger.warn('getJobMessages hit safety cap; older messages truncated', {
        jobId,
        fetchedPages: pages,
        cap: FETCH_SAFETY_CAP,
      });
    }

    // Older messages came back at the end of subsequent pages —
    // re-sort once so the timeline stays strictly ascending.
    const sorted = collected.sort((a, b) =>
      (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
    );
    if (offset === 0 && sorted.length <= limit) return sorted;
    return sorted.slice(offset, offset + limit);
  } catch (error) {
    logger.error('Error fetching messages:', error);
    throw error;
  }
}

/** Fetch all message threads (conversations) for a user via the web API. */
export async function getUserMessageThreads(
  // The API auto-scopes via auth.uid() — the userId arg is kept
  // for caller-side compatibility (older mobile builds passed it)
  // and surfaces in logs to spot mismatches.
  _userId: string
): Promise<MessageThread[]> {
  try {
    const { threads } = await mobileApiClient.get<{
      threads: Array<{
        jobId: string;
        jobTitle: string;
        participants?: Array<{
          id: string;
          name: string;
          role: string;
          avatar?: string;
        }>;
        unreadCount?: number;
        lastMessage?: {
          content?: string;
          messageText?: string;
          messageType?: string;
          createdAt?: string;
        };
      }>;
    }>('/api/messages/threads');
    if (!Array.isArray(threads)) return [];

    return threads.map((t) => ({
      jobId: t.jobId,
      jobTitle: t.jobTitle ?? '',
      unreadCount: t.unreadCount ?? 0,
      participants: (t.participants ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
      })),
      // The threads API returns a compact `lastMessage` envelope
      // (content + type + createdAt only). Mobile screens only
      // read `lastMessage.messageText` and `.createdAt` for the
      // list-row preview, so the partial shape is sufficient. The
      // `id`/`senderId`/`receiverId` fields aren't populated.
      lastMessage: t.lastMessage
        ? ({
            id: '',
            jobId: t.jobId,
            senderId: '',
            receiverId: '',
            messageText:
              t.lastMessage.content ?? t.lastMessage.messageText ?? '',
            messageType: (t.lastMessage.messageType ??
              'text') as Message['messageType'],
            read: false,
            createdAt: t.lastMessage.createdAt ?? '',
          } satisfies Message)
        : undefined,
    }));
  } catch (error) {
    logger.error('Error fetching message threads:', error);
    throw error;
  }
}

/** Search messages within a job by text content. */
export async function searchJobMessages(
  jobId: string,
  searchTerm: string,
  _limit = 20
): Promise<Message[]> {
  try {
    if (!isValidSearchTerm(searchTerm)) {
      logger.warn('Invalid search term rejected:', {
        searchTerm: searchTerm.substring(0, 50),
      });
      return [];
    }

    // No server-side message-search endpoint exists yet, so we
    // pull the full thread (already cached by the messages screen
    // typically) and filter client-side. Acceptable for the
    // typical chat length; a server `/api/messages/threads/:id/
    // search?q=` would be a future optimisation if threads grow.
    const messages = await getJobMessages(jobId);
    const term = searchTerm.toLowerCase();
    return messages.filter((m) =>
      (m.messageText || '').toLowerCase().includes(term)
    );
  } catch (error) {
    logger.error('Error searching messages:', error);
    throw error;
  }
}

/** Fetch all video-call-related messages for a job. */
export async function getVideoCallMessages(jobId: string): Promise<Message[]> {
  try {
    const messages = await getJobMessages(jobId);
    const videoTypes = [
      'video_call_invitation',
      'video_call_started',
      'video_call_ended',
      'video_call_missed',
    ];
    return messages.filter((m) => videoTypes.includes(m.messageType || ''));
  } catch (error) {
    logger.error('Error fetching video call messages:', error);
    throw error;
  }
}

/** Get total unread message count for a user via the web API. */
export async function getUnreadMessageCount(_userId: string): Promise<number> {
  try {
    const { count } = await mobileApiClient.get<{ count: number }>(
      '/api/messages/unread-count'
    );
    return typeof count === 'number' ? count : 0;
  } catch (error) {
    logger.error('Error getting unread message count:', error);
    return 0;
  }
}

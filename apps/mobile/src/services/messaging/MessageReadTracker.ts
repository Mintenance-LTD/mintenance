import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';

/**
 * Mark all messages addressed to `userId` in this job conversation
 * as read.
 *
 * Audit step 5 + 10 (2026-04-29): migrated off direct
 * `supabase.from('messages').update({ read: true })`. The web
 * route also fires the same UPDATE but with the participant
 * ownership check enforced server-side, and respects the user's
 * notification-preferences before resolving the read receipt.
 *
 * The `_userId` arg is kept for caller-side API compatibility —
 * the route uses `auth.uid()` so the supplied id is informational.
 */
export async function markMessagesAsRead(
  jobId: string,
  _userId: string
): Promise<void> {
  try {
    await mobileApiClient.post(
      `/api/messages/threads/${encodeURIComponent(jobId)}/read`
    );
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    throw error;
  }
}

/**
 * **Deprecated** — kept exported for the MessagingService facade
 * but throws on call. The previous implementation wrote
 * `update({ message_text: '[Message deleted]' })` to a column
 * that doesn't exist in the live `messages` table (the actual
 * column is `content`), so any caller that reached this code path
 * silently failed.
 *
 * Audit step 5 + 10 (2026-04-29): grep confirms zero non-test
 * callers in `apps/mobile/src/screens/**`. Surface the unfinished
 * state to anyone who wires a UI to it later, rather than letting
 * the stale direct-DB write linger and rot. Build the API endpoint
 * (`DELETE /api/messages/:id` does not exist yet) before
 * un-deprecating.
 */
export async function deleteMessage(
  _messageId: string,
  _userId: string
): Promise<void> {
  throw new Error(
    'deleteMessage is not implemented. Build the DELETE /api/messages/:id ' +
      'endpoint and re-route this method through it before wiring a UI.'
  );
}

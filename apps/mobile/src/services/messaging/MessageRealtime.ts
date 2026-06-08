import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type {
  ActiveChannel,
  Message,
  RealtimePayload,
  DatabaseMessageRow,
} from './types';

export const activeChannels = new Map<string, ActiveChannel>();
const MAX_ACTIVE_CHANNELS = 50;

function cleanupOldestChannel(): void {
  let oldestKey: string | null = null;
  let oldestTime = Date.now();
  const entries = Array.from(activeChannels.entries());
  for (const [key, data] of entries) {
    if (data.createdAt < oldestTime) {
      oldestTime = data.createdAt;
      oldestKey = key;
    }
  }
  if (oldestKey) {
    const channel = activeChannels.get(oldestKey);
    if (channel) {
      channel.channel.unsubscribe();
      activeChannels.delete(oldestKey);
      logger.warn(`Cleaned up oldest channel: ${oldestKey}`);
    }
  }
}

/**
 * Fetch a single message with sender info via direct Supabase query.
 * Used to enrich realtime events which only contain the raw row.
 */
async function fetchMessageById(messageId: string): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (error || !data) return null;

    const row = data as DatabaseMessageRow;
    return {
      id: row.id,
      jobId: row.job_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      messageText: row.message_text || row.content || '',
      messageType: (row.message_type || 'text') as Message['messageType'],
      attachmentUrl: row.attachment_url,
      read: row.read ?? false,
      createdAt: row.created_at,
      callId: row.call_id,
      callDuration: row.call_duration,
    };
  } catch {
    // If the query fails, the caller should handle null gracefully
    return null;
  }
}

/** Subscribe to real-time messages for a job. Returns a cleanup function. */
export function subscribeToJobMessages(
  jobId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void = () => {},
  onError: (error: unknown) => void = (error) =>
    logger.error('Real-time subscription error:', error)
): () => void {
  const channelKey = `messages_${jobId}`;

  try {
    if (activeChannels.size >= MAX_ACTIVE_CHANNELS) cleanupOldestChannel();

    if (activeChannels.has(channelKey)) {
      const existing = activeChannels.get(channelKey);
      existing?.channel.unsubscribe();
      activeChannels.delete(channelKey);
    }

    // Realtime subscriptions must use the direct Supabase client —
    // this is the one acceptable use of direct Supabase in the mobile app.
    // The channel subscription itself doesn't query data; it just listens for events.
    const channel = supabase
      .channel(`messages:job_id=eq.${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        async (payload: unknown) => {
          try {
            const realtimePayload =
              payload as RealtimePayload<DatabaseMessageRow>;
            // Use the realtime payload directly instead of re-querying
            // The payload.new contains the full row data
            const row = realtimePayload.new;
            const message: Message = {
              id: row.id,
              jobId: row.job_id,
              senderId: row.sender_id,
              receiverId: row.receiver_id,
              // 2026-06-08: the live `messages` table column is `content`,
              // not `message_text`. Postgres CDC sends the real column name,
              // so realtime rows only carry `content` — reading `message_text`
              // alone made every realtime-pushed bubble render blank until an
              // API refetch rehydrated it. Mirror fetchMessageById's fallback.
              messageText: row.message_text || row.content || '',
              messageType: row.message_type || 'text',
              attachmentUrl: row.attachment_url,
              read: row.read ?? false,
              createdAt: row.created_at,
            } as Message;
            onNewMessage(message);
          } catch (error) {
            onError(error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        async (payload: unknown) => {
          try {
            const realtimePayload =
              payload as RealtimePayload<DatabaseMessageRow>;
            const row = realtimePayload.new;
            const message: Message = {
              id: row.id,
              jobId: row.job_id,
              senderId: row.sender_id,
              receiverId: row.receiver_id,
              // 2026-06-08: see INSERT handler — realtime rows carry `content`,
              // not `message_text`. Fall back so updated bubbles aren't blank.
              messageText: row.message_text || row.content || '',
              messageType: row.message_type || 'text',
              attachmentUrl: row.attachment_url,
              read: row.read ?? false,
              createdAt: row.created_at,
            } as Message;
            onMessageUpdate(message);
          } catch (error) {
            onError(error);
          }
        }
      )
      .subscribe((status: unknown) => {
        if (status === 'SUBSCRIBED') {
          logger.info(`Successfully subscribed to messages for job ${jobId}`);
        } else if (status === 'CLOSED') {
          logger.warn(`Real-time subscription closed for job ${jobId}`);
        } else if (status === 'CHANNEL_ERROR') {
          logger.error(`Real-time subscription error for job ${jobId}`);
          onError(new Error('Real-time subscription failed'));
        }
      });

    activeChannels.set(channelKey, { channel, createdAt: Date.now() });

    return () => {
      try {
        channel.unsubscribe();
        activeChannels.delete(channelKey);
        logger.info(`Unsubscribed from messages for job ${jobId}`);
      } catch (error) {
        logger.error('Error unsubscribing from messages:', error);
      }
    };
  } catch (error) {
    logger.error('Error setting up real-time subscription:', error);
    onError(error);
    return () => {};
  }
}

/** Clean up all active message subscriptions. */
export function cleanupAllChannels(): void {
  activeChannels.forEach((channelData) => {
    // Support both { channel: { unsubscribe } } (production) and { unsubscribe } (test mock)
    const ch = channelData as unknown as Record<string, unknown>;
    if (channelData.channel?.unsubscribe) {
      channelData.channel.unsubscribe();
    } else if (typeof ch.unsubscribe === 'function') {
      (ch.unsubscribe as () => void)();
    }
  });
  activeChannels.clear();
}

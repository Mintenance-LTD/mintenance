import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { formatMessage } from './MessageHelpers';
import type { DatabaseMessageRow, ActiveChannel, Message, RealtimePayload } from './types';

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

/** Subscribe to real-time messages for a job. Returns a cleanup function. */
export function subscribeToJobMessages(
  jobId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void = () => {},
  onError: (error: unknown) => void = (error) => logger.error('Real-time subscription error:', error)
): () => void {
  const channelKey = `messages_${jobId}`;

  try {
    if (activeChannels.size >= MAX_ACTIVE_CHANNELS) cleanupOldestChannel();

    if (activeChannels.has(channelKey)) {
      const existing = activeChannels.get(channelKey);
      existing?.channel.unsubscribe();
      activeChannels.delete(channelKey);
    }

    const channel = supabase
      .channel(`messages:job_id=eq.${jobId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
        async (payload: unknown) => {
          try {
            const realtimePayload = payload as RealtimePayload<DatabaseMessageRow>;
            const { data, error } = await supabase
              .from('messages')
              .select('*, sender:users!messages_sender_id_fkey(first_name, last_name, role)')
              .eq('id', realtimePayload.new.id)
              .single();
            if (error) { onError(error); return; }
            if (data) onNewMessage(formatMessage(data as DatabaseMessageRow));
          } catch (error) { onError(error); }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
        async (payload: unknown) => {
          try {
            const realtimePayload = payload as RealtimePayload<DatabaseMessageRow>;
            const { data, error } = await supabase
              .from('messages')
              .select('*, sender:users!messages_sender_id_fkey(first_name, last_name, role)')
              .eq('id', realtimePayload.new.id)
              .single();
            if (error) { onError(error); return; }
            if (data) onMessageUpdate(formatMessage(data as DatabaseMessageRow));
          } catch (error) { onError(error); }
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

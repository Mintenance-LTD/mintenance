import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { isValidSearchTerm } from '../../utils/sqlSanitization';
import type { Message, MessageThread, DatabaseMessageRow } from './types';

/** Map a database row to the camelCase Message interface. */
function mapRowToMessage(row: DatabaseMessageRow): Message {
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
    senderName: row.sender
      ? `${row.sender.first_name || ''} ${row.sender.last_name || ''}`.trim()
      : undefined,
    senderRole: row.sender?.role,
  };
}

/** Fetch paginated messages for a job conversation via direct Supabase query. */
export async function getJobMessages(
  jobId: string,
  limit = 50,
  offset = 0
): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(
        '*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, role, profile_image_url)'
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching messages:', error.message);
      throw new Error(error.message);
    }

    return (data ?? []).map((row: DatabaseMessageRow) => mapRowToMessage(row));
  } catch (error) {
    logger.error('Error fetching messages:', error);
    throw error;
  }
}

/** Fetch all message threads (conversations) for a user via direct Supabase query. */
export async function getUserMessageThreads(
  userId: string
): Promise<MessageThread[]> {
  try {
    const { data, error } = await supabase
      .from('message_threads')
      .select('*, messages(id, message_text, created_at, sender_id, read)')
      .contains('participant_ids', [userId])
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Error fetching message threads:', error.message);
      throw new Error(error.message);
    }

    // Map database rows to MessageThread interface
    return (data ?? []).map((row: Record<string, unknown>) => {
      const messages = (row.messages as Record<string, unknown>[]) ?? [];
      const lastMsg = messages[0];
      const unread = messages.filter(
        (m: Record<string, unknown>) => m.sender_id !== userId && !m.read
      ).length;

      return {
        jobId: row.job_id as string,
        jobTitle: (row.job_title as string) || '',
        lastMessage: lastMsg
          ? {
              id: lastMsg.id as string,
              jobId: row.job_id as string,
              senderId: lastMsg.sender_id as string,
              receiverId: '',
              messageText: (lastMsg.message_text as string) || '',
              messageType: 'text' as const,
              read: (lastMsg.read as boolean) ?? false,
              createdAt: lastMsg.created_at as string,
            }
          : undefined,
        unreadCount: unread,
        participants: ((row.participant_ids as string[]) ?? []).map(
          (pid: string) => ({
            id: pid,
            name: '',
            role: '',
          })
        ),
      } as MessageThread;
    });
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

    // Fetch all messages and filter client-side
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

/** Get total unread message count for a user via direct Supabase query. */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) {
      logger.error('Error getting unread message count:', error.message);
      throw new Error(error.message);
    }

    return count || 0;
  } catch (error) {
    logger.error('Error getting unread message count:', error);
    return 0;
  }
}

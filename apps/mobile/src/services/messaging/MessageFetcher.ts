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
    // Messages table uses 'content' column (not 'message_text')
    const { data, error } = await supabase
      .from('messages')
      .select(
        'id, job_id, sender_id, receiver_id, content, message_type, attachment_url, read, created_at, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, role, profile_image_url)'
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching messages:', error.message);
      throw new Error(error.message);
    }

    return (data ?? []).map((row: Record<string, unknown>) => {
      // Supabase FK join returns sender as array — unwrap to single object
      const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
      return mapRowToMessage({
        ...row,
        sender,
      } as unknown as DatabaseMessageRow);
    });
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
    // 1. Get all threads the user participates in, join with jobs for title
    const { data: threads, error } = await supabase
      .from('message_threads')
      .select(
        'id, job_id, participant_ids, updated_at, job:jobs!message_threads_job_id_fkey(id, title)'
      )
      .contains('participant_ids', [userId])
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Error fetching message threads:', error.message);
      throw new Error(error.message);
    }

    if (!threads || threads.length === 0) return [];

    // 2. Fetch participant profiles for names
    const allParticipantIds = new Set<string>();
    threads.forEach((t: Record<string, unknown>) => {
      ((t.participant_ids as string[]) ?? []).forEach((pid) => allParticipantIds.add(pid));
    });
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, profile_image_url')
      .in('id', Array.from(allParticipantIds));
    const profileMap = new Map<string, { name: string; role: string; avatar?: string }>();
    (profiles ?? []).forEach((p: Record<string, unknown>) => {
      profileMap.set(p.id as string, {
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
        role: (p.role as string) || '',
        avatar: p.profile_image_url as string | undefined,
      });
    });

    // 3. For each thread, get the last message and unread count via job_id
    const jobIds = threads.map(
      (t: Record<string, unknown>) => t.job_id as string
    );

    // Get recent messages per job (limited to avoid OOM on large threads)
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('id, job_id, sender_id, content, read, created_at')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(jobIds.length * 2);

    // Get unread counts per job for this user
    const { data: unreadData } = await supabase
      .from('messages')
      .select('job_id')
      .in('job_id', jobIds)
      .eq('receiver_id', userId)
      .eq('read', false);

    // Build lookup maps
    const lastMsgByJob = new Map<string, Record<string, unknown>>();
    (lastMessages ?? []).forEach((msg: Record<string, unknown>) => {
      const jid = msg.job_id as string;
      if (!lastMsgByJob.has(jid)) lastMsgByJob.set(jid, msg);
    });

    const unreadByJob = new Map<string, number>();
    (unreadData ?? []).forEach((row: Record<string, unknown>) => {
      const jid = row.job_id as string;
      unreadByJob.set(jid, (unreadByJob.get(jid) || 0) + 1);
    });

    // 3. Map to MessageThread interface
    return threads.map((row: Record<string, unknown>) => {
      const jobId = row.job_id as string;
      const job = row.job as Record<string, unknown> | null;
      const lastMsg = lastMsgByJob.get(jobId);

      return {
        jobId,
        jobTitle: (job?.title as string) || '',
        lastMessage: lastMsg
          ? {
              id: lastMsg.id as string,
              jobId,
              senderId: lastMsg.sender_id as string,
              receiverId: '',
              messageText: (lastMsg.content as string) || '',
              messageType: 'text' as const,
              read: (lastMsg.read as boolean) ?? false,
              createdAt: lastMsg.created_at as string,
            }
          : undefined,
        unreadCount: unreadByJob.get(jobId) || 0,
        participants: ((row.participant_ids as string[]) ?? []).map(
          (pid: string) => {
            const profile = profileMap.get(pid);
            return {
              id: pid,
              name: profile?.name || '',
              role: profile?.role || '',
              avatar: profile?.avatar,
            };
          }
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

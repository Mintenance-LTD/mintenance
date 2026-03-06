import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { sanitizeForSQL, isValidSearchTerm } from '../../utils/sqlSanitization';
import { formatMessage } from './MessageHelpers';
import type { DatabaseMessageRow, Message, MessageThread } from './types';

/** Fetch paginated messages for a job conversation. */
export async function getJobMessages(
  jobId: string,
  limit = 50,
  offset = 0
): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:users!messages_sender_id_fkey(first_name, last_name, role)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data as DatabaseMessageRow[]).map(formatMessage).reverse();
  } catch (error) {
    logger.error('Error fetching messages:', error);
    throw error;
  }
}

/** Fetch all message threads (conversations) for a user. */
export async function getUserMessageThreads(userId: string): Promise<MessageThread[]> {
  try {
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(
        'id, title, homeowner_id, contractor_id, homeowner:users!jobs_homeowner_id_fkey(first_name, last_name, role), contractor:users!jobs_contractor_id_fkey(first_name, last_name, role)'
      )
      .or(`homeowner_id.eq.${userId},contractor_id.eq.${userId}`);

    if (jobsError) throw jobsError;

    const threads: MessageThread[] = await Promise.all(
      (jobs as { id: string; title: string; homeowner_id: string; contractor_id: string | null; homeowner: Record<string, unknown> | null; contractor: Record<string, unknown> | null }[]).map(async (job) => {
        const [lastMessageResult, unreadResult] = await Promise.all([
          supabase
            .from('messages')
            .select('id, job_id, sender_id, receiver_id, message_text, message_type, attachment_url, read, created_at, sender:users!messages_sender_id_fkey(first_name, last_name, role)')
            .eq('job_id', job.id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('job_id', job.id)
            .eq('receiver_id', userId)
            .eq('read', false),
        ]);

        return {
          jobId: job.id,
          jobTitle: job.title,
          lastMessage: lastMessageResult.data?.[0]
            ? formatMessage(lastMessageResult.data[0] as DatabaseMessageRow)
            : undefined,
          unreadCount: unreadResult.count ?? 0,
          participants: [
            {
              id: job.homeowner_id,
              name: `${job.homeowner?.first_name || ''} ${job.homeowner?.last_name || ''}`.trim(),
              role: String(job.homeowner?.role || 'homeowner'),
            },
            job.contractor ? {
              id: String(job.contractor_id || ''),
              name: `${job.contractor?.first_name || ''} ${job.contractor?.last_name || ''}`.trim(),
              role: String(job.contractor?.role || 'contractor'),
            } : null,
          ].filter((p): p is { id: string; name: string; role: string } => p !== null),
        };
      })
    );

    return threads.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || '0';
      const bTime = b.lastMessage?.createdAt || '0';
      return bTime.localeCompare(aTime);
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
  limit = 20
): Promise<Message[]> {
  try {
    if (!isValidSearchTerm(searchTerm)) {
      logger.warn('Invalid search term rejected:', { searchTerm: searchTerm.substring(0, 50) });
      return [];
    }
    const sanitizedSearchTerm = sanitizeForSQL(searchTerm);
    if (!sanitizedSearchTerm) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:users!messages_sender_id_fkey(first_name, last_name, role)')
      .eq('job_id', jobId)
      .ilike('message_text', `%${sanitizedSearchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as DatabaseMessageRow[]).map(formatMessage);
  } catch (error) {
    logger.error('Error searching messages:', error);
    throw error;
  }
}

/** Fetch all video-call-related messages for a job. */
export async function getVideoCallMessages(jobId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:users!messages_sender_id_fkey(first_name, last_name, role)')
      .eq('job_id', jobId)
      .in('message_type', ['video_call_invitation', 'video_call_started', 'video_call_ended', 'video_call_missed'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as DatabaseMessageRow[]).map(formatMessage);
  } catch (error) {
    logger.error('Error fetching video call messages:', error);
    throw error;
  }
}

/** Get total unread message count for a user. */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    logger.error('Error getting unread message count:', error);
    return 0;
  }
}

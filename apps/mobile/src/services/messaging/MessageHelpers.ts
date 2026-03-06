import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { DatabaseMessageRow, Message } from './types';

/** Format a raw database row into the typed Message interface. */
export function formatMessage(data: DatabaseMessageRow): Message {
  return {
    id: data.id || '',
    jobId: data.job_id || '',
    senderId: data.sender_id || '',
    receiverId: data.receiver_id || '',
    messageText: data.content || data.message_text || '',
    messageType: (data.message_type as Message['messageType']) || 'text',
    attachmentUrl: data.attachment_url,
    callId: data.call_id,
    callDuration: data.call_duration,
    read: Boolean(data.read),
    createdAt: data.created_at || new Date().toISOString(),
    senderName: data.sender
      ? `${data.sender.first_name || ''} ${data.sender.last_name || ''}`.trim()
      : 'Unknown User',
    senderRole: data.sender?.role,
  };
}

/** Format call duration (seconds) for display. */
export function formatCallDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

/** Insert a notification record for a new message recipient. */
export async function createMessageNotification(
  message: DatabaseMessageRow,
  receiverId: string
): Promise<void> {
  try {
    await supabase.from('notifications').insert([
      {
        user_id: receiverId,
        title: 'New Message',
        message: `${message.sender?.first_name || 'Someone'} sent you a message`,
        type: 'message',
        action_url: `/jobs/${message.job_id}/messages`,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    logger.error('Error creating message notification:', error);
  }
}

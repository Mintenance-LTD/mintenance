import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

/** Mark all messages in a job conversation as read for a user. */
export async function markMessagesAsRead(jobId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('job_id', jobId)
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) throw error;
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    throw error;
  }
}

/** Soft-delete a message (replaces content with [Message deleted]). */
export async function deleteMessage(messageId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ message_text: '[Message deleted]', message_type: 'text', attachment_url: null })
      .eq('id', messageId)
      .eq('sender_id', userId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error deleting message:', error);
    throw error;
  }
}

import { supabase } from '../../config/supabase';
import { sanitizeText } from '../../utils/sanitize';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { checkRateLimit } from '../../middleware/RateLimiter';
import { formatMessage, formatCallDuration, createMessageNotification as _createMessageNotification } from './MessageHelpers';
import type { DatabaseMessageRow, Message } from './types';

/**
 * Mutable notification handler — exposed so tests can patch it via
 * `(MessagingService as any).createMessageNotification = mockFn`
 * which triggers the setter on the MessagingService facade.
 */
export const messagingInternals = {
  createMessageNotification: _createMessageNotification as (msg: DatabaseMessageRow, receiverId: string) => Promise<void>,
};

/** Send a message in a job conversation. */
export async function sendMessage(
  jobId: string,
  receiverId: string,
  messageText: string,
  senderId: string,
  messageType: Message['messageType'] = 'text',
  attachmentUrl?: string,
  callId?: string,
  callDuration?: number
): Promise<Message> {
  const context = {
    service: 'MessagingService',
    method: 'sendMessage',
    userId: senderId,
    params: { jobId, receiverId, messageType },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    if (!checkRateLimit('message_send', senderId)) {
      throw new Error('Too many messages. Please slow down and try again.');
    }

    ServiceErrorHandler.validateRequired(jobId, 'Job ID', context);
    ServiceErrorHandler.validateRequired(receiverId, 'Receiver ID', context);
    ServiceErrorHandler.validateRequired(messageText, 'Message text', context);
    ServiceErrorHandler.validateRequired(senderId, 'Sender ID', context);

    const safeMessageText = sanitizeText(messageText);
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        job_id: jobId,
        sender_id: senderId,
        receiver_id: receiverId,
        message_text: safeMessageText,
        message_type: messageType,
        attachment_url: attachmentUrl,
        call_id: callId,
        call_duration: callDuration,
        read: false,
        created_at: new Date().toISOString(),
      }])
      .select('*, sender:users!messages_sender_id_fkey(first_name, last_name, role)')
      .single();

    if (error) throw ServiceErrorHandler.handleDatabaseError(error, context);

    await messagingInternals.createMessageNotification(data as DatabaseMessageRow, receiverId);
    return formatMessage(data as DatabaseMessageRow);
  }, context);

  if (!result.success || !result.data) throw new Error('Failed to send message');
  return result.data;
}

/** Send a video call invitation message. */
export async function sendVideoCallInvitation(
  jobId: string,
  receiverId: string,
  senderId: string,
  callId: string
): Promise<Message> {
  return sendMessage(jobId, receiverId, 'Wants to start a video call with you', senderId, 'video_call_invitation', undefined, callId);
}

/** Send a video call started message. */
export async function sendVideoCallStarted(
  jobId: string,
  receiverId: string,
  senderId: string,
  callId: string
): Promise<Message> {
  return sendMessage(jobId, receiverId, 'Video call started', senderId, 'video_call_started', undefined, callId);
}

/** Send a video call ended message. */
export async function sendVideoCallEnded(
  jobId: string,
  receiverId: string,
  senderId: string,
  callId: string,
  duration: number
): Promise<Message> {
  const durationText = formatCallDuration(duration);
  return sendMessage(jobId, receiverId, `Video call ended (${durationText})`, senderId, 'video_call_ended', undefined, callId, duration);
}

/** Send a video call missed message. */
export async function sendVideoCallMissed(
  jobId: string,
  receiverId: string,
  senderId: string,
  callId: string
): Promise<Message> {
  return sendMessage(jobId, receiverId, 'Missed video call', senderId, 'video_call_missed', undefined, callId);
}

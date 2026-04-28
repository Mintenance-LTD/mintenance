import { mobileApiClient } from '../../utils/mobileApiClient';
import { sanitizeText } from '../../utils/sanitize';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { checkRateLimit } from '../../middleware/RateLimiter';
import {
  formatCallDuration,
  createMessageNotification as _createMessageNotification,
} from './MessageHelpers';
import type { DatabaseMessageRow, Message } from './types';

/**
 * Mutable notification handler — exposed so tests can patch it via
 * `(MessagingService as any).createMessageNotification = mockFn`
 * which triggers the setter on the MessagingService facade.
 */
export const messagingInternals = {
  createMessageNotification: _createMessageNotification as (
    msg: DatabaseMessageRow,
    receiverId: string
  ) => Promise<void>,
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
    ServiceErrorHandler.validateRequired(senderId, 'Sender ID', context);

    // Either text or an attachment is required. Image/file messages
    // sent from the attach button pass an empty messageText with a
    // non-empty attachmentUrl — the previous required-text check
    // rejected those entirely so the attach flow always errored.
    const trimmedText = (messageText ?? '').trim();
    if (!trimmedText && !attachmentUrl) {
      throw new Error('Message text or attachment is required');
    }

    const safeMessageText = sanitizeText(messageText);

    // Route through API — the thread ID is the jobId in this API
    const response = await mobileApiClient.post<{ message: Message }>(
      `/api/messages/threads/${jobId}/messages`,
      {
        content: safeMessageText,
        receiverId,
        messageType: messageType as string,
        attachments: attachmentUrl ? [attachmentUrl] : undefined,
      }
    );

    if (!response.message) throw new Error('No message returned from API');
    return response.message;
  }, context);

  if (!result.success || !result.data)
    throw new Error('Failed to send message');
  return result.data;
}

/** Send a video call invitation message. */
export async function sendVideoCallInvitation(
  jobId: string,
  receiverId: string,
  senderId: string,
  callId: string
): Promise<Message> {
  return sendMessage(
    jobId,
    receiverId,
    'Wants to start a video call with you',
    senderId,
    'video_call_invitation',
    undefined,
    callId
  );
}

/** Send a video call started message. */
export async function sendVideoCallStarted(
  jobId: string,
  receiverId: string,
  senderId: string,
  callId: string
): Promise<Message> {
  return sendMessage(
    jobId,
    receiverId,
    'Video call started',
    senderId,
    'video_call_started',
    undefined,
    callId
  );
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
  return sendMessage(
    jobId,
    receiverId,
    `Video call ended (${durationText})`,
    senderId,
    'video_call_ended',
    undefined,
    callId,
    duration
  );
}

/** Send a video call missed message. */
export async function sendVideoCallMissed(
  jobId: string,
  receiverId: string,
  senderId: string,
  callId: string
): Promise<Message> {
  return sendMessage(
    jobId,
    receiverId,
    'Missed video call',
    senderId,
    'video_call_missed',
    undefined,
    callId
  );
}

/**
 * MessagingService — thin facade over the messaging/ subdirectory modules.
 * All implementation lives in messaging/*.ts; this file is the public API surface.
 */
export type { Message, MessageThread } from './messaging/types';

import { sendMessage, sendVideoCallInvitation, sendVideoCallStarted, sendVideoCallEnded, sendVideoCallMissed, messagingInternals } from './messaging/MessageSender';
import { getJobMessages, getUserMessageThreads, searchJobMessages, getVideoCallMessages, getUnreadMessageCount } from './messaging/MessageFetcher';
import { markMessagesAsRead, deleteMessage } from './messaging/MessageReadTracker';
import { subscribeToJobMessages, cleanupAllChannels, activeChannels } from './messaging/MessageRealtime';
import { formatMessage } from './messaging/MessageHelpers';
import type { DatabaseMessageRow } from './messaging/types';

export class MessagingService {
  // Exposed for test compatibility (tests access private state via (MessagingService as any).*)
  static activeChannels = activeChannels;
  static formatMessage = formatMessage;
  static sendMessage = sendMessage;
  static getJobMessages = getJobMessages;
  static getUserMessageThreads = getUserMessageThreads;
  static markMessagesAsRead = markMessagesAsRead;
  static subscribeToJobMessages = subscribeToJobMessages;
  static getUnreadMessageCount = getUnreadMessageCount;
  static deleteMessage = deleteMessage;
  static searchJobMessages = searchJobMessages;
  static sendVideoCallInvitation = sendVideoCallInvitation;
  static sendVideoCallStarted = sendVideoCallStarted;
  static sendVideoCallEnded = sendVideoCallEnded;
  static sendVideoCallMissed = sendVideoCallMissed;
  static getVideoCallMessages = getVideoCallMessages;
  // Aliases for backward compatibility
  static getConversations = getUserMessageThreads;
  static markAsRead = markMessagesAsRead;
  static cleanup = cleanupAllChannels;

  /**
   * createMessageNotification — getter/setter so tests can patch it:
   * `(MessagingService as any).createMessageNotification = mockFn`
   * Updates messagingInternals which sendMessage references at call-time.
   */
  static get createMessageNotification() {
    return messagingInternals.createMessageNotification;
  }
  static set createMessageNotification(fn: (msg: DatabaseMessageRow, receiverId: string) => Promise<void>) {
    messagingInternals.createMessageNotification = fn;
  }
}

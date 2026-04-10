/**
 * Messaging and conversation standardized types
 */

import type { User } from './user';
import type { Job } from './jobs';

// =============================================
// MESSAGING TYPES
// =============================================

export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'video_call_invitation'
  | 'video_call_started'
  | 'video_call_ended'
  | 'video_call_missed';

export interface Message {
  id: string;
  jobId: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  messageType: MessageType;
  attachmentUrl?: string;
  read: boolean;
  createdAt: string;
  syncedAt?: string;
  // Computed fields
  senderName?: string;
  senderRole?: string;
  // Video call specific fields
  callId?: string;
  callDuration?: number;
  // Relationships
  sender?: User;
  receiver?: User;
  job?: Job;
}

interface MessageThread {
  jobId: string;
  jobTitle: string;
  lastMessage?: Message;
  unreadCount: number;
  participants: {
    id: string;
    name: string;
    role: string;
  }[];
}

// Database field mapping type
export type DatabaseMessage = {
  id: string;
  job_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  message_type: MessageType;
  attachment_url?: string;
  read: boolean;
  created_at: string;
  synced_at?: string;
  call_id?: string;
  call_duration?: number;
};

// Re-exports for backward compatibility

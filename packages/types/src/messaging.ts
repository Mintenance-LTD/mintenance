import type { Job } from './jobs';
import type { User } from './user';

// Message types
export interface Message {
  id: string;
  jobId?: string;
  senderId: string;
  receiverId: string;
  messageText?: string;
  content?: string;
  messageType?: 'text' | 'image' | 'file' | 'video_call_invitation' | 'video_call_started' | 'video_call_ended' | 'video_call_missed' | 'contract_submitted';
  attachmentUrl?: string;
  callId?: string;
  callDuration?: number;
  read?: boolean;
  createdAt: string;
  syncedAt?: string;
  senderName?: string;
  senderRole?: string;
  // Relationships
  sender?: User;
  receiver?: User;
  job?: Job;
}

export interface MessageThread {
  jobId: string;
  jobTitle: string;
  participants: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  unreadCount: number;
  lastMessage?: Message;
}

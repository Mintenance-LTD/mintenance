import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// DATABASE ROW INTERFACES (snake_case from database)
// ============================================================================

export interface DatabaseMessageRow {
  id: string;
  job_id: string;
  sender_id: string;
  receiver_id: string;
  message_text?: string;
  content?: string;
  message_type: string;
  attachment_url?: string;
  call_id?: string;
  call_duration?: number;
  read: boolean;
  created_at: string;
  sender?: {
    first_name?: string;
    last_name?: string;
    role?: string;
  };
  [key: string]: unknown;
}

export interface RealtimePayload<T = Record<string, unknown>> {
  new: T;
  old?: T;
  error?: unknown;
  [key: string]: unknown;
}

export interface ActiveChannel {
  channel: RealtimeChannel;
  createdAt: number;
}

export interface Message {
  id: string;
  jobId: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  messageType: 'text' | 'image' | 'file' | 'video_call_invitation' | 'video_call_started' | 'video_call_ended' | 'video_call_missed';
  attachmentUrl?: string;
  read: boolean;
  createdAt: string;
  callId?: string;
  callDuration?: number;
  senderName?: string;
  senderRole?: string;
}

export interface MessageThread {
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

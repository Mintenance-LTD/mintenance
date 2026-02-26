import type { Job } from './jobs';
import type { User } from './user';

// Message types matching DB: public.messages
export interface Message {
  id: string;
  thread_id?: string; // DB: NOT NULL FK to message_threads
  jobId?: string;
  senderId: string;
  receiverId?: string; // Not in DB (thread-based model), kept for UI compatibility
  messageText?: string;
  content?: string; // DB column name
  messageType?: 'text' | 'image' | 'file' | 'system'; // DB CHECK constraint values
  attachmentUrl?: string; // Stored in metadata JSONB
  callId?: string;
  callDuration?: number;
  read?: boolean;
  read_by?: string[]; // DB: UUID[] tracking who has read
  metadata?: Record<string, unknown>; // DB: JSONB
  createdAt: string;
  syncedAt?: string;
  senderName?: string;
  senderRole?: string;
  // DB field aliases (snake_case)
  sender_id?: string;
  message_type?: string;
  created_at?: string;
  // Relationships
  sender?: User;
  receiver?: User;
  job?: Job;
}

// MessageThread matching DB: public.message_threads
export interface MessageThread {
  id?: string; // DB primary key
  job_id?: string; // DB: FK to jobs
  jobId?: string; // camelCase alias
  jobTitle?: string; // Populated from join
  participant_ids?: string[]; // DB: UUID[] NOT NULL
  participants?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  last_message_at?: string; // DB column
  unreadCount?: number; // Computed
  lastMessage?: Message;
  created_at?: string;
  updated_at?: string;
}

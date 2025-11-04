import type { Message, MessageThread } from '@mintenance/types';

export type SupabasePerson = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  email?: string | null;
  company_name?: string | null;
};

export type SupabaseJobRow = {
  id: string;
  title: string | null;
  homeowner_id: string;
  contractor_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  homeowner?: SupabasePerson | null;
  contractor?: SupabasePerson | null;
};

export type SupabaseMessageRow = {
  id: string;
  job_id: string;
  sender_id: string;
  receiver_id: string;
  message_text?: string | null;
  content?: string | null; // Support both column names for schema flexibility
  message_type: string | null;
  attachment_url?: string | null;
  call_id?: string | null;
  call_duration?: number | null;
  read: boolean | null;
  created_at: string;
  sender?: SupabasePerson | null;
};

export const MESSAGE_TYPES = [
  'text',
  'image',
  'file',
  'video_call_invitation',
  'video_call_started',
  'video_call_ended',
  'video_call_missed',
  'contract_submitted',
] as const;

type MessageType = (typeof MESSAGE_TYPES)[number];

const MESSAGE_TYPE_SET = new Set<string>(MESSAGE_TYPES);

export const normalizeMessageType = (value?: string | null): MessageType => {
  if (!value) return 'text';
  return MESSAGE_TYPE_SET.has(value) ? (value as MessageType) : 'text';
};

export const formatDisplayName = (person?: SupabasePerson | null, fallback?: { email?: string; company_name?: string }): string => {
  if (!person) {
    // Try fallback data
    if (fallback?.company_name) {
      return fallback.company_name;
    }
    if (fallback?.email) {
      return fallback.email.split('@')[0]; // Use email username as fallback
    }
    return 'Unknown User';
  }
  
  const first = person.first_name?.trim() ?? '';
  const last = person.last_name?.trim() ?? '';
  const full = `${first} ${last}`.trim();
  
  if (full) {
    return full;
  }
  
  // Try fallback data if name is empty
  if (fallback?.company_name) {
    return fallback.company_name;
  }
  if (fallback?.email) {
    return fallback.email.split('@')[0];
  }
  
  return 'Unknown User';
};

export const toTimestamp = (value?: string | null): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const mapMessageRow = (row: SupabaseMessageRow): Message => {
  // Handle both message_text and content column names
  const messageText = row.message_text ?? row.content ?? '';
  
  return {
    id: row.id,
    jobId: row.job_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    messageText,
    messageType: normalizeMessageType(row.message_type),
    attachmentUrl: row.attachment_url ?? undefined,
    callId: row.call_id ?? undefined,
    callDuration: row.call_duration ?? undefined,
    read: Boolean(row.read),
    createdAt: row.created_at,
    senderName: row.sender ? formatDisplayName(row.sender, {
      email: row.sender.email ?? undefined,
      company_name: row.sender.company_name ?? undefined,
    }) : undefined,
    senderRole: row.sender?.role ?? undefined,
  };
};

export const buildThreadParticipants = (job: SupabaseJobRow): MessageThread['participants'] => {
  const participants: MessageThread['participants'] = [];

  if (job.homeowner_id) {
    participants.push({
      id: job.homeowner_id,
      name: formatDisplayName(job.homeowner, {
        email: job.homeowner?.email ?? undefined,
        company_name: job.homeowner?.company_name ?? undefined,
      }),
      role: job.homeowner?.role ?? 'homeowner',
    });
  }

  if (job.contractor_id) {
    participants.push({
      id: job.contractor_id,
      name: formatDisplayName(job.contractor, {
        email: job.contractor?.email ?? undefined,
        company_name: job.contractor?.company_name ?? undefined,
      }),
      role: job.contractor?.role ?? 'contractor',
    });
  }

  return participants;
};

import type { Message, MessageThread } from '@mintenance/types';

export type SupabasePerson = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
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
  message_text: string | null;
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
] as const;

type MessageType = (typeof MESSAGE_TYPES)[number];

const MESSAGE_TYPE_SET = new Set<string>(MESSAGE_TYPES);

export const normalizeMessageType = (value?: string | null): MessageType => {
  if (!value) return 'text';
  return MESSAGE_TYPE_SET.has(value) ? (value as MessageType) : 'text';
};

export const formatDisplayName = (person?: SupabasePerson | null): string => {
  const first = person?.first_name?.trim() ?? '';
  const last = person?.last_name?.trim() ?? '';
  const full = `${first} ${last}`.trim();
  return full || 'Unknown User';
};

export const toTimestamp = (value?: string | null): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const mapMessageRow = (row: SupabaseMessageRow): Message => ({
  id: row.id,
  jobId: row.job_id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  messageText: row.message_text ?? '',
  messageType: normalizeMessageType(row.message_type),
  attachmentUrl: row.attachment_url ?? undefined,
  callId: row.call_id ?? undefined,
  callDuration: row.call_duration ?? undefined,
  read: Boolean(row.read),
  createdAt: row.created_at,
  senderName: row.sender ? formatDisplayName(row.sender) : undefined,
  senderRole: row.sender?.role ?? undefined,
});

export const buildThreadParticipants = (job: SupabaseJobRow): MessageThread['participants'] => {
  const participants: MessageThread['participants'] = [];

  if (job.homeowner_id) {
    participants.push({
      id: job.homeowner_id,
      name: formatDisplayName(job.homeowner),
      role: job.homeowner?.role ?? 'homeowner',
    });
  }

  if (job.contractor_id) {
    participants.push({
      id: job.contractor_id,
      name: formatDisplayName(job.contractor),
      role: job.contractor?.role ?? 'contractor',
    });
  }

  return participants;
};

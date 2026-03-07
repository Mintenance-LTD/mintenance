export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
    online: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string;
    read: boolean;
  };
  jobTitle?: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  attachment_url?: string;
  created_at: string;
  read: boolean;
}

export interface JobContext {
  id: string;
  title: string;
  status: string;
  budget?: number;
  deadline?: string;
}

export interface Participant {
  id: string;
  name: string;
  profile_image_url?: string;
}

export interface ApiThread {
  jobId: string;
  participants: Participant[];
  lastMessage?: {
    content?: string;
    messageText?: string;
    createdAt: string;
  };
  jobTitle?: string;
  unreadCount?: number;
}

export interface ApiMessageResponse {
  id: string;
  senderId?: string;
  sender_id?: string;
  content?: string;
  messageText?: string;
  messageType?: string;
  message_type?: string;
  attachmentUrl?: string;
  attachment_url?: string;
  createdAt?: string;
  created_at?: string;
  read?: boolean;
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + 'm';
  if (diffHours < 24) return diffHours + 'h';
  if (diffDays < 7) return diffDays + 'd';
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'posted':
      return 'bg-blue-100 text-blue-700';
    case 'in_progress':
      return 'bg-teal-100 text-teal-700';
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'cancelled':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

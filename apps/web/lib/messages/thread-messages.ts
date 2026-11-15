import { getCsrfHeaders } from '@/lib/csrf-client';
import toast from 'react-hot-toast';
export interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  attachment_url?: string;
  created_at: string;
  read: boolean;
}

interface ApiMessageResponse {
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

export async function fetchThreadMessages(
  threadId: string,
  onRead: () => void
): Promise<Message[]> {
  const response = await fetch(`/api/messages/threads/${threadId}/messages`);
  if (!response.ok) throw new Error('Failed to fetch messages');

  const data = await response.json();
  const messages = (data.messages || []).map(
    (msg: ApiMessageResponse): Message => ({
      id: msg.id,
      sender_id: msg.senderId || msg.sender_id || '',
      content: msg.content || msg.messageText || '',
      message_type: msg.messageType || msg.message_type || 'text',
      attachment_url: msg.attachmentUrl || msg.attachment_url || undefined,
      created_at: msg.createdAt || msg.created_at || '',
      read: msg.read !== undefined ? msg.read : true,
    })
  );

  // Acknowledgement must pass CSRF and succeed before clearing unread badges.
  try {
    const readResponse = await fetch(`/api/messages/threads/${threadId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getCsrfHeaders()),
      },
    });
    if (!readResponse.ok) throw new Error('Read acknowledgement failed');
    onRead();
  } catch {
    toast.error(
      'Messages loaded, but the read status could not be saved. Reopen this conversation to retry.'
    );
  }

  return messages;
}

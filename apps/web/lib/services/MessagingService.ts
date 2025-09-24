import type { Message, MessageThread } from '@mintenance/types';

interface ThreadMessagesResponse {
  messages?: Message[];
  nextCursor?: string;
}

interface ThreadListResponse {
  threads?: MessageThread[];
  nextCursor?: string;
}

const API_BASE = '/api/messages';

export class MessagingService {
  private static activeChannels = new Map<string, () => void>();

  static async sendMessage(
    jobId: string,
    receiverId: string,
    messageText: string,
    senderId: string,
    messageType:
      | 'text'
      | 'image'
      | 'file'
      | 'video_call_invitation'
      | 'video_call_started'
      | 'video_call_ended'
      | 'video_call_missed' = 'text',
    attachmentUrl?: string,
    callId?: string,
    callDuration?: number
  ): Promise<Message> {
    if (!jobId || !receiverId || !senderId || !messageText.trim()) {
      throw new Error('Missing required fields for sending message');
    }

    const resp = await fetch(`${API_BASE}/threads/${encodeURIComponent(jobId)}/messages`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: messageText,
        attachments: attachmentUrl ? [attachmentUrl] : undefined,
        receiverId,
        senderId,
        messageType,
        callId,
        callDuration,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Failed to send message: ${text}`);
    }

    const { message } = (await resp.json()) as { message: Message };
    return message;
  }

  static async getJobMessages(jobId: string, limit = 50): Promise<Message[]> {
    if (!jobId) return [];

    const resp = await fetch(
      `${API_BASE}/threads/${encodeURIComponent(jobId)}?limit=${encodeURIComponent(String(limit))}`,
      { credentials: 'same-origin' }
    );

    if (!resp.ok) {
      return [];
    }

    const json = (await resp.json()) as ThreadMessagesResponse;
    return json.messages ?? [];
  }

  static async getUserMessageThreads(_userId: string): Promise<MessageThread[]> {
    const resp = await fetch(`${API_BASE}/threads`, { credentials: 'same-origin' });
    if (!resp.ok) {
      return [];
    }
    const json = (await resp.json()) as ThreadListResponse;
    return json.threads ?? [];
  }

  static async markMessagesAsRead(jobId: string, _userId: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/threads/${encodeURIComponent(jobId)}/read`, {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch (error) {
      console.warn('[MessagingService] markMessagesAsRead failed', error);
    }
  }

  static async getUnreadMessageCount(_userId: string): Promise<number> {
    try {
      const resp = await fetch(`${API_BASE}/unread-count`, { credentials: 'same-origin' });
      if (!resp.ok) return 0;
      const json = await resp.json().catch(() => ({}));
      return typeof json.count === 'number' ? json.count : 0;
    } catch {
      return 0;
    }
  }

  static subscribeToJobMessages(
    jobId: string,
    onNewMessage: (message: Message) => void,
    _onMessageUpdate?: (message: Message) => void,
    onError?: (error: unknown) => void
  ): () => void {
    if (!jobId) {
      return () => {};
    }

    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        try {
          const messages = await MessagingService.getJobMessages(jobId, 1);
          if (messages.length > 0) {
            onNewMessage(messages[0]);
          }
        } catch (error) {
          onError?.(error);
        }
        await new Promise((resolve) => setTimeout(resolve, 15000));
      }
    };

    poll();

    const cleanup = () => {
      cancelled = true;
      this.activeChannels.delete(jobId);
    };

    this.activeChannels.set(jobId, cleanup);
    return cleanup;
  }

  static cleanup(): void {
    this.activeChannels.forEach((cleanup) => cleanup());
    this.activeChannels.clear();
  }
}

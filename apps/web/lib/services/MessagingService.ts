import type { Message, MessageThread } from '@mintenance/types';
import { logger } from '@/lib/logger';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
      | 'system' = 'text',
    attachmentUrl?: string,
    callId?: string,
    callDuration?: number
  ): Promise<Message> {
    if (!jobId || !receiverId || !senderId || !messageText.trim()) {
      throw new Error('Missing required fields for sending message');
    }

    // Fetch CSRF token for the POST request
    let csrfToken = '';
    try {
      const csrfResp = await fetch('/api/csrf', { credentials: 'same-origin' });
      if (csrfResp.ok) {
        const csrfData = await csrfResp.json();
        csrfToken = csrfData.token || '';
      }
    } catch {
      // CSRF fetch failed — request will still be attempted
    }

    const resp = await fetch(`${API_BASE}/threads/${encodeURIComponent(jobId)}/messages`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: JSON.stringify({
        content: messageText,
        attachments: attachmentUrl ? [attachmentUrl] : undefined,
        receiverId,
        messageType,
        callId,
        callDuration,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      let errorDetails = text;
      try {
        const json = JSON.parse(text);
        errorDetails = json.details || json.error || text;
      } catch {
        // If parsing fails, use the text as-is
      }
      throw new Error(`Failed to send message: ${errorDetails}`);
    }

    const { message } = (await resp.json()) as { message: Message };
    return message;
  }

  static async getJobMessages(jobId: string, limit = 50): Promise<Message[]> {
    if (!jobId) {
      logger.warn('[MessagingService] getJobMessages called without jobId');
      return [];
    }

    try {
      const resp = await fetch(
        `${API_BASE}/threads/${encodeURIComponent(jobId)}?limit=${encodeURIComponent(String(limit))}`,
        { credentials: 'same-origin' }
      );

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        logger.error('[MessagingService] getJobMessages failed', {
          jobId,
          status: resp.status,
          statusText: resp.statusText,
          error: errorText,
        });
        return [];
      }

      const json = (await resp.json()) as ThreadMessagesResponse;
      const messages = json.messages ?? [];
      
      logger.info('[MessagingService] getJobMessages success', {
        jobId,
        messageCount: messages.length,
      });
      
      return messages;
    } catch (error) {
      logger.error('[MessagingService] getJobMessages exception', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
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
      logger.warn('[MessagingService] markMessagesAsRead failed', error);
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

    // Use Supabase Realtime if configured, fall back to polling
    if (isSupabaseConfigured) {
      // Subscribe to messages table on INSERT. We filter by table-level and
      // resolve the job association client-side (Supabase realtime filter
      // doesn't support cross-table joins).
      const channelName = `messages:job=${jobId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            try {
              const row = payload.new as Record<string, unknown>;
              const readBy = Array.isArray(row.read_by) ? row.read_by as string[] : [];
              const metadata = (row.metadata ?? {}) as Record<string, unknown>;
              const msg: Message = {
                id: row.id as string,
                jobId,
                senderId: row.sender_id as string,
                receiverId: '',
                messageText: (row.content as string) || '',
                messageType: ((row.message_type as string) || 'text') as 'text' | 'image' | 'file' | 'system',
                attachmentUrl: (metadata.attachment_url as string) || undefined,
                read: readBy.length > 1,
                createdAt: row.created_at as string,
              };
              onNewMessage(msg);
            } catch (error) {
              onError?.(error);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            logger.error('[MessagingService] Realtime channel error, falling back to polling', { jobId });
            // Fall back to polling on channel error
            channel.unsubscribe();
            this.activeChannels.delete(jobId);
            this._startPolling(jobId, onNewMessage, onError);
          }
        });

      const cleanup = () => {
        channel.unsubscribe();
        this.activeChannels.delete(jobId);
      };

      this.activeChannels.set(jobId, cleanup);
      return cleanup;
    }

    // Fallback: polling every 5 seconds
    return this._startPolling(jobId, onNewMessage, onError);
  }

  private static _startPolling(
    jobId: string,
    onNewMessage: (message: Message) => void,
    onError?: (error: unknown) => void
  ): () => void {
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
        await new Promise((resolve) => setTimeout(resolve, 5000));
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

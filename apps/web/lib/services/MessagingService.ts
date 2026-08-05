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

// A Realtime channel SUBSCRIBEs successfully even for an anonymous browser
// session, but RLS on `messages` denies every row when auth.uid() is NULL — so
// no INSERT event ever arrives and chat would silently freeze. If no event is
// seen within this window after subscribing, we assume Realtime is inert for
// this session and fall back to polling. (Web currently authenticates with a
// custom JWT cookie and never establishes a Supabase session — see Task 6.)
const REALTIME_WATCHDOG_MS = 8000;

export class MessagingService {
  private static activeChannels = new Map<string, () => void>();

  static async sendMessage(
    jobId: string,
    receiverId: string,
    messageText: string,
    senderId: string,
    messageType: 'text' | 'image' | 'file' | 'system' = 'text',
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

    const resp = await fetch(
      `${API_BASE}/threads/${encodeURIComponent(jobId)}/messages`,
      {
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
      }
    );

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

  static async getUserMessageThreads(
    _userId: string
  ): Promise<MessageThread[]> {
    const resp = await fetch(`${API_BASE}/threads`, {
      credentials: 'same-origin',
    });
    if (!resp.ok) {
      return [];
    }
    const json = (await resp.json()) as ThreadListResponse;
    return json.threads ?? [];
  }

  static async markMessagesAsRead(
    jobId: string,
    _userId: string
  ): Promise<void> {
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
      const resp = await fetch(`${API_BASE}/unread-count`, {
        credentials: 'same-origin',
      });
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

    // Use Supabase Realtime if configured, fall back to polling.
    if (isSupabaseConfigured) {
      // Scope the subscription to THIS job's messages with a server-side
      // filter. Previously it subscribed to every INSERT on `messages`
      // table-wide and resolved the job association client-side — so if RLS
      // were ever loosened for the subscriber role, every browser would
      // receive every message on the platform. RLS is the primary guard; this
      // filter is defence in depth + a smaller event stream.
      const channelName = `messages:job=${jobId}`;
      let fellBack = false;
      let receivedEvent = false;
      let watchdog: ReturnType<typeof setTimeout> | undefined;

      const fallBackToPolling = (reason: string) => {
        if (fellBack) return;
        fellBack = true;
        if (watchdog) clearTimeout(watchdog);
        logger.warn(
          '[MessagingService] Realtime not delivering, falling back to polling',
          { jobId, reason }
        );
        try {
          channel.unsubscribe();
        } catch {
          /* already torn down */
        }
        this.activeChannels.delete(jobId);
        // _startPolling registers its own cleanup under activeChannels[jobId].
        this._startPolling(jobId, onNewMessage, onError);
      };

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `job_id=eq.${jobId}`,
          },
          (payload) => {
            // A real event proves Realtime is delivering — cancel the watchdog.
            receivedEvent = true;
            if (watchdog) {
              clearTimeout(watchdog);
              watchdog = undefined;
            }
            try {
              const row = payload.new as Record<string, unknown>;
              const msg: Message = {
                id: row.id as string,
                jobId: (row.job_id as string) || jobId,
                senderId: row.sender_id as string,
                receiverId: (row.receiver_id as string) || '',
                messageText: (row.content as string) || '',
                messageType: ((row.message_type as string) || 'text') as
                  | 'text'
                  | 'image'
                  | 'file'
                  | 'system',
                attachmentUrl: (row.attachment_url as string) || undefined,
                read: Boolean(row.read),
                createdAt: row.created_at as string,
              };
              onNewMessage(msg);
            } catch (error) {
              onError?.(error);
            }
          }
        )
        .subscribe((status) => {
          // Previously this only reacted to CHANNEL_ERROR — but a subscription
          // that SUBSCRIBEs yet never delivers a row (the anon-RLS case, and
          // the reason web chat was silently dead) never emitted CHANNEL_ERROR,
          // so polling never started. Cover the terminal error states AND arm a
          // watchdog on SUBSCRIBED that polls if no event arrives.
          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            fallBackToPolling(status);
          } else if (status === 'SUBSCRIBED' && !receivedEvent && !watchdog) {
            watchdog = setTimeout(() => {
              if (!receivedEvent) {
                fallBackToPolling('no realtime events after subscribe');
              }
            }, REALTIME_WATCHDOG_MS);
          }
        });

      const cleanup = () => {
        if (watchdog) clearTimeout(watchdog);
        if (fellBack) {
          // Polling now owns activeChannels[jobId]; delegate to its cleanup.
          this.activeChannels.get(jobId)?.();
          return;
        }
        try {
          channel.unsubscribe();
        } catch {
          /* already torn down */
        }
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

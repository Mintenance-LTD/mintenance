'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/** Per-client connection limit to prevent resource exhaustion (Issue 37) */
const MAX_CHANNELS_PER_CLIENT = 10;
const activeChannels = new Set<ReturnType<typeof supabase.channel>>();
let nextSubscriptionId = 0;

/**
 * Payload for realtime database changes
 */
type RealtimePayload<
  T extends Record<string, unknown> = Record<string, unknown>,
> = RealtimePostgresChangesPayload<T>;

interface RealtimeConfig<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  table: string;
  schema?: string;
  filter?: string;
  onInsert?: (payload: RealtimePayload<T>) => void;
  onUpdate?: (payload: RealtimePayload<T>) => void;
  onDelete?: (payload: RealtimePayload<T>) => void;
  onError?: (error: Error) => void;
}

interface RealtimeStatus {
  connected: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

/**
 * Hook for real-time database updates using Supabase Realtime
 *
 * @example
 * ```typescript
 * const { status, subscribe, unsubscribe } = useRealtime({
 *   table: 'jobs',
 *   filter: 'contractor_id=eq.123',
 *   onInsert: (payload) => // logger.info('New job:', payload.new', { service: 'general' }),
 *   onUpdate: (payload) => // logger.info('Job updated:', payload.new', { service: 'general' }),
 * });
 * ```
 */
export function useRealtime(config?: RealtimeConfig) {
  const [status, setStatus] = useState<RealtimeStatus>({
    connected: false,
    error: null,
    lastUpdate: null,
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const releaseChannel = useCallback(() => {
    const channel = channelRef.current;
    channelRef.current = null;
    if (!channel) return;
    activeChannels.delete(channel);
    try {
      void supabase.removeChannel(channel).catch(() => {
        logger.warn('Realtime channel cleanup failed');
      });
    } catch {
      logger.warn('Realtime channel cleanup failed');
    }
  }, []);

  const unsubscribe = useCallback(() => {
    releaseChannel();
    setStatus({ connected: false, error: null, lastUpdate: null });
  }, [releaseChannel]);

  const subscribe = useCallback(
    (customConfig?: RealtimeConfig) => {
      releaseChannel();
      setStatus({ connected: false, error: null, lastUpdate: null });
      const finalConfig = customConfig ?? configRef.current;
      if (!finalConfig) return;
      const callbacks = () => customConfig ?? configRef.current ?? finalConfig;
      const fail = (message: string) => {
        setStatus((prev) => ({ ...prev, connected: false, error: message }));
        logger.warn('Realtime subscription unavailable', { reason: message });
        callbacks().onError?.(new Error(message));
      };
      if (activeChannels.size >= MAX_CHANNELS_PER_CLIENT) {
        fail(`Channel limit (${MAX_CHANNELS_PER_CLIENT}) reached`);
        return;
      }
      const { table, schema = 'public', filter } = finalConfig;
      try {
        // Separate ownership prevents one consumer unsubscribing another.
        const channel = supabase.channel(
          `${schema}:${table}:${++nextSubscriptionId}`
        );
        channelRef.current = channel;
        activeChannels.add(channel); // Reserve while connecting too.
        channel
          .on(
            'postgres_changes',
            { event: '*', schema, table, filter },
            (payload) => {
              if (channelRef.current !== channel) return;
              setStatus((prev) => ({ ...prev, lastUpdate: new Date() }));
              switch (payload.eventType) {
                case 'INSERT':
                  callbacks().onInsert?.(payload);
                  break;
                case 'UPDATE':
                  callbacks().onUpdate?.(payload);
                  break;
                case 'DELETE':
                  callbacks().onDelete?.(payload);
                  break;
              }
            }
          )
          .subscribe((connectionStatus) => {
            if (channelRef.current !== channel) return;
            if (connectionStatus === 'SUBSCRIBED') {
              setStatus((prev) => ({ ...prev, connected: true, error: null }));
            } else if (
              connectionStatus === 'CHANNEL_ERROR' ||
              connectionStatus === 'TIMED_OUT'
            ) {
              // The SDK may reconnect this channel; keep its slot reserved.
              fail(`Connection ${connectionStatus}`);
            } else if (connectionStatus === 'CLOSED') {
              releaseChannel();
              fail('Connection CLOSED');
            }
          });
      } catch {
        // Safari can throw before subscribe returns. Consumers can use HTTP;
        // do not weaken TLS/CSP or let the exception take down the page.
        releaseChannel();
        fail('Realtime connection could not be opened');
      }
    },
    [releaseChannel]
  );

  useEffect(() => {
    subscribe();
    return unsubscribe;
  }, [config?.table, config?.schema, config?.filter, subscribe, unsubscribe]);

  return { status, subscribe, unsubscribe };
}

/**
 * User presence data
 */
interface PresenceUserData {
  id?: string;
  name?: string;
  avatar?: string;
  [key: string]: unknown;
}

/**
 * Presence state map
 */
type PresenceState = Record<string, PresenceUserData[]>;

/**
 * Hook for realtime presence (track online users)
 */
function useRealtimePresence(roomId: string) {
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`presence:${roomId}`, {
      config: {
        presence: {
          key: 'user',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState;
        setPresenceState(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.info('User joined:', { key, newPresences });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.info('User left:', { key, leftPresences });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const trackPresence = useCallback((userData: PresenceUserData) => {
    if (channelRef.current) {
      channelRef.current.track(userData);
    }
  }, []);

  const untrackPresence = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.untrack();
    }
  }, []);

  return {
    presenceState,
    trackPresence,
    untrackPresence,
    onlineCount: Object.keys(presenceState).length,
  };
}

/**
 * Broadcast message structure
 */
interface BroadcastMessage {
  id?: string;
  type?: string;
  content?: string;
  timestamp?: number;
  senderId?: string;
  [key: string]: unknown;
}

/**
 * Hook for realtime broadcast (send and receive messages)
 */
function useRealtimeBroadcast<T extends BroadcastMessage = BroadcastMessage>(
  channelName: string
) {
  const [messages, setMessages] = useState<T[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`broadcast:${channelName}`);

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        setMessages((prev) => [...prev, payload.payload as T]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [channelName]);

  const send = useCallback((message: T) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: message,
      });
    }
  }, []);

  return {
    messages,
    send,
  };
}

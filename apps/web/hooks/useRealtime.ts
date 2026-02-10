'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Placeholder fallbacks prevent module-level throws during next build.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Per-client connection limit to prevent resource exhaustion (Issue 37) */
const MAX_CHANNELS_PER_CLIENT = 10;
const activeChannels = new Set<string>();

/**
 * Payload for realtime database changes
 */
export type RealtimePayload<T extends Record<string, unknown> = Record<string, unknown>> = 
  RealtimePostgresChangesPayload<T>;

export interface RealtimeConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  table: string;
  schema?: string;
  filter?: string;
  onInsert?: (payload: RealtimePayload<T>) => void;
  onUpdate?: (payload: RealtimePayload<T>) => void;
  onDelete?: (payload: RealtimePayload<T>) => void;
  onError?: (error: Error) => void;
}

export interface RealtimeStatus {
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
  const configRef = useRef<RealtimeConfig | undefined>(config);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const subscribe = useCallback((customConfig?: RealtimeConfig) => {
    const finalConfig = customConfig || configRef.current;
    
    if (!finalConfig) {
      logger.error('No configuration provided for realtime subscription');
      return;
    }

    // Unsubscribe from existing channel
    if (channelRef.current) {
      const prevName = (channelRef.current as unknown as { topic?: string }).topic;
      if (prevName) activeChannels.delete(prevName);
      channelRef.current.unsubscribe();
    }

    const { table, schema = 'public', filter, onInsert, onUpdate, onDelete, onError } = finalConfig;

    // Create a unique channel name
    const channelName = `${schema}:${table}${filter ? `:${filter}` : ''}`;

    // Enforce per-client connection limit
    if (activeChannels.size >= MAX_CHANNELS_PER_CLIENT && !activeChannels.has(channelName)) {
      logger.error('Realtime channel limit reached', {
        max: MAX_CHANNELS_PER_CLIENT,
        active: activeChannels.size,
        rejected: channelName,
      });
      onError?.(new Error(`Channel limit (${MAX_CHANNELS_PER_CLIENT}) reached`));
      return;
    }
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema,
          table,
          filter,
        },
        (payload) => {
          setStatus(prev => ({
            ...prev,
            lastUpdate: new Date(),
          }));

          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          activeChannels.add(channelName);
          setStatus(prev => ({
            ...prev,
            connected: true,
            error: null,
          }));
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          activeChannels.delete(channelName);
          setStatus(prev => ({
            ...prev,
            connected: false,
            error: `Connection ${status}`,
          }));
          onError?.(new Error(`Connection ${status}`));
        }
      });

    channelRef.current = channel;
  }, []);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      const topic = (channelRef.current as unknown as { topic?: string }).topic;
      if (topic) activeChannels.delete(topic);
      channelRef.current.unsubscribe();
      channelRef.current = null;
      setStatus({
        connected: false,
        error: null,
        lastUpdate: null,
      });
    }
  }, []);

  // Auto-subscribe if config is provided
  useEffect(() => {
    if (config) {
      subscribe(config);
    }

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe/unsubscribe are stable refs
  }, [config?.table, config?.filter, subscribe, unsubscribe]);

  return {
    status,
    subscribe,
    unsubscribe,
  };
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
export function useRealtimePresence(roomId: string) {
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
export function useRealtimeBroadcast<T extends BroadcastMessage = BroadcastMessage>(channelName: string) {
  const [messages, setMessages] = useState<T[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`broadcast:${channelName}`);

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        setMessages(prev => [...prev, payload.payload as T]);
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


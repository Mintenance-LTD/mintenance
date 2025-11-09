'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface RealtimeConfig {
  table: string;
  schema?: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onError?: (error: any) => void;
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
 *   onInsert: (payload) => console.log('New job:', payload.new),
 *   onUpdate: (payload) => console.log('Job updated:', payload.new),
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
      console.error('No configuration provided for realtime subscription');
      return;
    }

    // Unsubscribe from existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const { table, schema = 'public', filter, onInsert, onUpdate, onDelete, onError } = finalConfig;

    // Create a unique channel name
    const channelName = `${schema}:${table}${filter ? `:${filter}` : ''}`;
    
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
          setStatus(prev => ({
            ...prev,
            connected: true,
            error: null,
          }));
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
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
  }, [config?.table, config?.filter]); // Re-subscribe when table or filter changes

  return {
    status,
    subscribe,
    unsubscribe,
  };
}

/**
 * Hook for realtime presence (track online users)
 */
export function useRealtimePresence(roomId: string) {
  const [presenceState, setPresenceState] = useState<Record<string, any>>({});
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
        const state = channel.presenceState();
        setPresenceState(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const trackPresence = useCallback((userData: any) => {
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
 * Hook for realtime broadcast (send and receive messages)
 */
export function useRealtimeBroadcast(channelName: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`broadcast:${channelName}`);

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        setMessages(prev => [...prev, payload.payload]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [channelName]);

  const send = useCallback((message: any) => {
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


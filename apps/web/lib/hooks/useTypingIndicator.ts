'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const TYPING_TIMEOUT_MS = 3000;
const BROADCAST_THROTTLE_MS = 1500;

interface UseTypingIndicatorOptions {
  channelId: string | null;
  userId: string | null;
}

/**
 * Hook for real-time typing indicators using Supabase broadcast.
 * Returns `isOtherTyping` (whether the other user is typing)
 * and `broadcastTyping()` to call when the current user types.
 */
export function useTypingIndicator({ channelId, userId }: UseTypingIndicatorOptions) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBroadcastRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!channelId || !userId || !isSupabaseConfigured) return;

    const channel = supabase.channel(`typing:${channelId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const senderId = payload.payload?.userId as string | undefined;
        if (senderId && senderId !== userId) {
          setIsOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), TYPING_TIMEOUT_MS);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelId, userId]);

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    const now = Date.now();
    if (now - lastBroadcastRef.current < BROADCAST_THROTTLE_MS) return;
    lastBroadcastRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId },
    });
  }, [userId]);

  return { isOtherTyping, broadcastTyping };
}

import { useEffect, useRef, useState } from 'react';
import { MessagingService } from '@/lib/services/MessagingService';
import { logger } from '@/lib/logger';
import type { Message } from '@mintenance/types';

interface UseRealTimeMessagesOptions {
  enabled?: boolean;
  onNewMessage?: (message: Message) => void;
  onMessageUpdate?: (message: Message) => void;
  onError?: (error: Error) => void;
}

export function useRealTimeMessages(
  jobId: string,
  options: UseRealTimeMessagesOptions = {}
) {
  const { enabled = true, onNewMessage, onMessageUpdate, onError } = options;

  const cleanupRef = useRef<(() => void) | null>(null);
  // Track connection status as state so the hook's return value doesn't
  // read `cleanupRef.current` during render. `react-hooks/refs` flags
  // ref access in render because the value isn't reactive — components
  // depending on `isConnected` would never re-render when it changes.
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !jobId) {
      return;
    }

    logger.info('Setting up real-time subscription for job', { jobId });

    // Set up real-time subscription
    const cleanup = MessagingService.subscribeToJobMessages(
      jobId,
      (newMessage: Message) => {
        logger.info('New message received', {
          messageId: newMessage.id,
          jobId,
        });
        onNewMessage?.(newMessage);
      },
      (updatedMessage: Message) => {
        logger.info('Message updated', { messageId: updatedMessage.id, jobId });
        onMessageUpdate?.(updatedMessage);
      },
      (error: unknown) => {
        logger.error('Real-time messaging error', error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    );

    cleanupRef.current = cleanup;
    setIsConnected(true);

    // Cleanup on unmount or dependency change
    return () => {
      logger.info('Cleaning up real-time subscription for job', { jobId });
      cleanup();
      cleanupRef.current = null;
      setIsConnected(false);
    };
  }, [jobId, enabled, onNewMessage, onMessageUpdate, onError]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    isConnected,
  };
}

// Note: `useRealTimeMessageThreads` (multi-job subscription manager) used
// to live here but was never imported anywhere in the app — confirmed via
// grep on 2026-04-28. It also tripped two `react-hooks/refs` warnings by
// reading `subscriptionsRef.current` during render to derive the
// `activeSubscriptions` return. Deleted in the same pass that converted
// the live hook's `isConnected` to state. If we ever need it back,
// reintroduce with state-driven `activeSubscriptions` from the start.

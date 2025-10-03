import { useEffect, useRef } from 'react';
import { MessagingService } from '@/lib/services/MessagingService';
import { logger } from '@/lib/logger';
import type { Message } from '@mintenance/types';

interface UseRealTimeMessagesOptions {
  enabled?: boolean;
  onNewMessage?: (message: Message) => void;
  onMessageUpdate?: (message: Message) => void;
  onError?: (error: any) => void;
}

export function useRealTimeMessages(
  jobId: string,
  options: UseRealTimeMessagesOptions = {}
) {
  const {
    enabled = true,
    onNewMessage,
    onMessageUpdate,
    onError
  } = options;

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !jobId) {
      return;
    }

    logger.info('Setting up real-time subscription for job', { jobId });

    // Set up real-time subscription
    const cleanup = MessagingService.subscribeToJobMessages(
      jobId,
      (newMessage: Message) => {
        logger.info('New message received', { messageId: newMessage.id, jobId });
        onNewMessage?.(newMessage);
      },
      (updatedMessage: Message) => {
        logger.info('Message updated', { messageId: updatedMessage.id, jobId });
        onMessageUpdate?.(updatedMessage);
      },
      (error: any) => {
        logger.error('Real-time messaging error', error);
        onError?.(error);
      }
    );

    cleanupRef.current = cleanup;

    // Cleanup on unmount or dependency change
    return () => {
      logger.info('Cleaning up real-time subscription for job', { jobId });
      cleanup();
      cleanupRef.current = null;
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
    // Return subscription status or any other useful info
    isConnected: cleanupRef.current !== null,
  };
}

// Hook for managing multiple real-time message subscriptions
export function useRealTimeMessageThreads(
  userId: string,
  onNewMessage?: (message: Message) => void,
  onError?: (error: any) => void
) {
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());

  const subscribeToJob = (jobId: string) => {
    if (subscriptionsRef.current.has(jobId)) {
      return; // Already subscribed
    }

    const cleanup = MessagingService.subscribeToJobMessages(
      jobId,
      (newMessage: Message) => {
        // Only handle messages for the current user
        if (newMessage.receiverId === userId) {
          onNewMessage?.(newMessage);
        }
      },
      () => {}, // onMessageUpdate - not needed for thread list
      (error: any) => {
        logger.error('Real-time error for job', error, { jobId });
        onError?.(error);
      }
    );

    subscriptionsRef.current.set(jobId, cleanup);
  };

  const unsubscribeFromJob = (jobId: string) => {
    const cleanup = subscriptionsRef.current.get(jobId);
    if (cleanup) {
      cleanup();
      subscriptionsRef.current.delete(jobId);
    }
  };

  const subscribeToMultipleJobs = (jobIds: string[]) => {
    // Unsubscribe from jobs no longer in the list
    const currentJobIds = Array.from(subscriptionsRef.current.keys());
    currentJobIds.forEach(jobId => {
      if (!jobIds.includes(jobId)) {
        unsubscribeFromJob(jobId);
      }
    });

    // Subscribe to new jobs
    jobIds.forEach(jobId => {
      subscribeToJob(jobId);
    });
  };

  const cleanup = () => {
    subscriptionsRef.current.forEach(cleanupFn => cleanupFn());
    subscriptionsRef.current.clear();
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return {
    subscribeToJob,
    unsubscribeFromJob,
    subscribeToMultipleJobs,
    cleanup,
    activeSubscriptions: Array.from(subscriptionsRef.current.keys()),
  };
}
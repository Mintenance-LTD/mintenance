import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessagingService, Message, MessageThread } from '../services/MessagingService';
import { useOfflineQuery, useOfflineMutation } from './useOfflineQuery';
import { queryKeys } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

/**
 * Hook to get message threads for current user (conversations list)
 */
export const useMessageThreads = () => {
  const { user } = useAuth();

  return useOfflineQuery({
    queryKey: queryKeys.messages.conversations(),
    queryFn: () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return MessagingService.getUserMessageThreads(user.id);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - conversations change frequently
  });
};

/**
 * Hook to get messages for a specific job
 */
export const useJobMessages = (jobId: string, limit: number = 50) => {
  return useOfflineQuery({
    queryKey: queryKeys.messages.conversation(jobId),
    queryFn: () => MessagingService.getJobMessages(jobId, limit),
    enabled: !!jobId,
    staleTime: 30 * 1000, // 30 seconds - messages are real-time
  });
};

/**
 * Hook to send a message
 */
export const useSendMessage = () => {
  return useOfflineMutation({
    mutationFn: async ({
      jobId,
      receiverId,
      messageText,
      senderId,
      messageType = 'text',
      attachmentUrl,
    }: {
      jobId: string;
      receiverId: string;
      messageText: string;
      senderId: string;
      messageType?: 'text' | 'image' | 'file';
      attachmentUrl?: string;
    }) => {
      return MessagingService.sendMessage(
        jobId,
        receiverId,
        messageText,
        senderId,
        messageType,
        attachmentUrl
      );
    },
    entity: 'message',
    actionType: 'CREATE',
    getQueryKey: (variables) => queryKeys.messages.conversation(variables.jobId),
    optimisticUpdate: (variables) => ({
      id: `temp_message_${Date.now()}`,
      jobId: variables.jobId,
      senderId: variables.senderId,
      receiverId: variables.receiverId,
      messageText: variables.messageText,
      messageType: variables.messageType || 'text',
      attachmentUrl: variables.attachmentUrl,
      read: false,
      createdAt: new Date().toISOString(),
      senderName: 'You',
    }),
  });
};

/**
 * Hook to mark messages as read
 */
export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, userId }: { jobId: string; userId: string }) => {
      return MessagingService.markMessagesAsRead(jobId, userId);
    },
    onSuccess: (_, { jobId }) => {
      // Update the conversation in the threads list
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(jobId) });
    },
    onError: (error) => {
      logger.error('Failed to mark messages as read:', error);
    },
  });
};

/**
 * Hook to get unread message count
 */
export const useUnreadMessageCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['messages', 'unread-count', user?.id],
    queryFn: () => {
      if (!user?.id) return 0;
      return MessagingService.getUnreadMessageCount(user.id);
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

/**
 * Hook to search messages in a job conversation
 */
export const useSearchJobMessages = (jobId: string, searchTerm: string, limit: number = 20) => {
  return useQuery({
    queryKey: ['messages', 'search', jobId, searchTerm],
    queryFn: () => MessagingService.searchJobMessages(jobId, searchTerm, limit),
    enabled: !!jobId && searchTerm.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes for search results
  });
};

/**
 * Hook to subscribe to real-time messages for a job
 */
export const useRealTimeMessages = (
  jobId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void = () => {},
  enabled: boolean = true
) => {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!jobId || !enabled) return;

    logger.info('Setting up real-time message subscription', { jobId });

    const unsubscribe = MessagingService.subscribeToJobMessages(
      jobId,
      (newMessage) => {
        // Call the provided callback
        onNewMessage(newMessage);

        // Update React Query cache
        queryClient.setQueryData(
          queryKeys.messages.conversation(jobId),
          (oldData: Message[] | undefined) => {
            if (!oldData) return [newMessage];
            
            // Check if message already exists (avoid duplicates)
            const exists = oldData.some(msg => msg.id === newMessage.id);
            if (exists) return oldData;
            
            return [...oldData, newMessage];
          }
        );

        // Invalidate conversations list to update last message and unread count
        queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
      },
      (updatedMessage) => {
        // Call the provided callback
        onMessageUpdate(updatedMessage);

        // Update React Query cache
        queryClient.setQueryData(
          queryKeys.messages.conversation(jobId),
          (oldData: Message[] | undefined) => {
            if (!oldData) return [updatedMessage];
            
            return oldData.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            );
          }
        );
      },
      (error) => {
        logger.error('Real-time message subscription error:', error);
      }
    );

    return () => {
      logger.info('Cleaning up real-time message subscription', { jobId });
      unsubscribe();
    };
  }, [jobId, enabled, onNewMessage, onMessageUpdate, queryClient]);
};

/**
 * Custom hook for managing message threads with real-time updates
 */
export const useMessageThreadsWithRealTime = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const threadsQuery = useMessageThreads();

  // Subscribe to message updates that could affect the threads list
  React.useEffect(() => {
    if (!user?.id || !threadsQuery.data) return;

    const subscriptions: (() => void)[] = [];

    // Subscribe to each active conversation
    threadsQuery.data.forEach((thread: MessageThread) => {
      const unsubscribe = MessagingService.subscribeToJobMessages(
        thread.jobId,
        (newMessage) => {
          // Update the threads list when new messages arrive
          queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
        },
        (updatedMessage) => {
          // Update if message read status changes
          if (updatedMessage.receiverId === user.id) {
            queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
          }
        }
      );

      subscriptions.push(unsubscribe);
    });

    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, [user?.id, threadsQuery.data, queryClient]);

  return threadsQuery;
};

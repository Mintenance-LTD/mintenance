/**
 * React Query hooks for Messages API
 *
 * Features:
 * - Automatic caching with shorter stale time for real-time feel
 * - Optimistic updates for sending messages
 * - Conversation management
 */

'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query-client';
import { logger } from '@mintenance/shared';

/**
 * Message data type
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
}

/**
 * Conversation data type
 */
export interface Conversation {
  id: string;
  job_id: string;
  participants: string[];
  last_message?: Message;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch conversations list
 */
async function fetchConversations(): Promise<Conversation[]> {
  const response = await fetch('/api/messages/conversations', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch conversations' }));
    throw new Error(error.error || 'Failed to fetch conversations');
  }

  const data = await response.json();
  return data.conversations || [];
}

/**
 * Fetch messages for a conversation
 */
async function fetchMessages(conversationId: string, cursor?: string): Promise<{
  messages: Message[];
  nextCursor?: string;
}> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);

  const response = await fetch(`/api/messages/${conversationId}?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch messages' }));
    throw new Error(error.error || 'Failed to fetch messages');
  }

  return response.json();
}

/**
 * Send a message
 */
async function sendMessage(messageData: {
  conversation_id?: string;
  job_id?: string;
  recipient_id?: string;
  content: string;
}): Promise<Message> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  const response = await fetch('/api/messages', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    body: JSON.stringify(messageData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
    throw new Error(error.error || 'Failed to send message');
  }

  const data = await response.json();
  return data.message;
}

/**
 * Mark message as read
 */
async function markAsRead(messageId: string): Promise<void> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  const response = await fetch(`/api/messages/${messageId}/read`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to mark message as read');
  }
}

/**
 * Hook to fetch conversations list
 *
 * @example
 * ```tsx
 * const { data: conversations, isLoading } = useConversations();
 *
 * return <ConversationsList conversations={conversations} />;
 * ```
 */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.messages.conversations(),
    queryFn: fetchConversations,
    staleTime: 1 * 60 * 1000, // 1 minute (more real-time)
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    retry: 2,
  });
}

/**
 * Hook to fetch messages with infinite scroll/pagination
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isLoading,
 * } = useMessages(conversationId);
 *
 * const messages = data?.pages.flatMap(page => page.messages) || [];
 *
 * return (
 *   <MessagesList messages={messages}>
 *     {hasNextPage && (
 *       <button onClick={() => fetchNextPage()}>Load More</button>
 *     )}
 *   </MessagesList>
 * );
 * ```
 */
export function useMessages(conversationId: string | null | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages.conversation(conversationId || ''),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchMessages(conversationId!, pageParam),
    enabled: !!conversationId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 10 * 1000, // Poll every 10 seconds for new messages
    retry: 2,
  });
}

/**
 * Hook to send a message
 *
 * @example
 * ```tsx
 * const sendMessageMutation = useSendMessage();
 *
 * const handleSend = async (content) => {
 *   await sendMessageMutation.mutateAsync({
 *     conversation_id: conversationId,
 *     content,
 *   });
 * };
 * ```
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onMutate: async (newMessage) => {
      // Optimistically add message to cache if we have a conversation_id
      if (newMessage.conversation_id) {
        const conversationKey = queryKeys.messages.conversation(newMessage.conversation_id);

        await queryClient.cancelQueries({ queryKey: conversationKey });

        const previousMessages = queryClient.getQueryData(conversationKey);

        queryClient.setQueryData(conversationKey, (old: unknown) => {
          const typedOld = old as { pages?: Array<{ messages: Message[] }> } | undefined;
          if (!typedOld?.pages) return old;

          const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            conversation_id: newMessage.conversation_id!,
            sender_id: 'current-user', // Will be replaced with actual data
            content: newMessage.content,
            read: false,
            created_at: new Date().toISOString(),
          };

          const newPages = [...typedOld.pages];
          if (newPages[0]) {
            newPages[0] = {
              ...newPages[0],
              messages: [optimisticMessage, ...newPages[0].messages],
            };
          }

          return {
            ...(old as Record<string, unknown>),
            pages: newPages,
          };
        });

        return { previousMessages };
      }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (variables.conversation_id && context?.previousMessages) {
        queryClient.setQueryData(
          queryKeys.messages.conversation(variables.conversation_id),
          context.previousMessages
        );
      }

      logger.error('Failed to send message', error, {
        service: 'messages',
      });
    },
    onSuccess: (sentMessage) => {
      // Invalidate conversations list (last message updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });

      // Invalidate the specific conversation
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversation(sentMessage.conversation_id),
      });

      logger.info('Message sent successfully', {
        service: 'messages',
        messageId: sentMessage.id,
        conversationId: sentMessage.conversation_id,
      });
    },
  });
}

/**
 * Hook to mark a message as read
 *
 * @example
 * ```tsx
 * const markReadMutation = useMarkAsRead();
 *
 * useEffect(() => {
 *   if (message && !message.read) {
 *     markReadMutation.mutate(message.id);
 *   }
 * }, [message]);
 * ```
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      // Invalidate conversations to update unread count
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
    },
  });
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { LoadingSpinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { MessagesConversationSidebar } from './components/MessagesConversationSidebar';
import { MessagesChatArea } from './components/MessagesChatArea';
import { MessagesEmptyState } from './components/MessagesEmptyState';
import { MintEditorialMessagesSidebar } from './components/MintEditorialMessagesSidebar';
import { MintEditorialMessagesChat } from './components/MintEditorialMessagesChat';
import { useTypingIndicator } from '@/lib/hooks/useTypingIndicator';

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
    online: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string;
    read: boolean;
  };
  jobTitle?: string;
  unreadCount: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  attachment_url?: string;
  created_at: string;
  read: boolean;
}

interface ApiMessageResponse {
  id: string;
  senderId?: string;
  sender_id?: string;
  content?: string;
  messageText?: string;
  messageType?: string;
  message_type?: string;
  attachmentUrl?: string;
  attachment_url?: string;
  createdAt?: string;
  created_at?: string;
  read?: boolean;
}

interface Participant {
  id: string;
  name: string;
  profile_image_url?: string;
}

interface ApiThread {
  jobId: string;
  participants: Participant[];
  lastMessage?: {
    content?: string;
    messageText?: string;
    createdAt: string;
  };
  jobTitle?: string;
  unreadCount?: number;
}

async function fetchThreads(userId: string): Promise<Conversation[]> {
  const response = await fetch('/api/messages/threads');
  if (!response.ok) throw new Error('Failed to fetch conversations');

  const data = await response.json();
  return (data.threads || []).map((thread: ApiThread) => {
    const otherParticipant = thread.participants.find(
      (p: Participant) => p.id !== userId
    );
    return {
      id: thread.jobId,
      otherUser: {
        id: otherParticipant?.id || '',
        name: otherParticipant?.name || 'Unknown User',
        avatar: otherParticipant?.profile_image_url,
        online: false,
      },
      lastMessage: thread.lastMessage
        ? {
            text:
              thread.lastMessage.content ||
              thread.lastMessage.messageText ||
              '',
            timestamp: thread.lastMessage.createdAt,
            read: true,
          }
        : {
            text: 'No messages yet',
            timestamp: new Date().toISOString(),
            read: true,
          },
      jobTitle: thread.jobTitle,
      unreadCount: thread.unreadCount || 0,
    };
  });
}

async function fetchThreadMessages(threadId: string): Promise<Message[]> {
  const response = await fetch(`/api/messages/threads/${threadId}/messages`);
  if (!response.ok) throw new Error('Failed to fetch messages');

  const data = await response.json();
  const messages = (data.messages || []).map(
    (msg: ApiMessageResponse): Message => ({
      id: msg.id,
      sender_id: msg.senderId || msg.sender_id || '',
      content: msg.content || msg.messageText || '',
      message_type: msg.messageType || msg.message_type || 'text',
      attachment_url: msg.attachmentUrl || msg.attachment_url || undefined,
      created_at: msg.createdAt || msg.created_at || '',
      read: msg.read !== undefined ? msg.read : true,
    })
  );

  // Mark as read (fire-and-forget)
  fetch(`/api/messages/threads/${threadId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {
    /* silent */
  });

  return messages;
}

export default function MessagesPage2025() {
  // The route-level `messages/error.tsx` is the authoritative error
  // surface — it renders inside the homeowner shell with a "Failed to
  // load messages" message and a retry. The previous component-level
  // `<ErrorBoundary>` here intercepted first and rendered a full-bleed
  // "Something went wrong" page outside the shell, which is what
  // homeowners screenshot-reported on the Vercel preview.
  return (
    <Suspense
      fallback={<LoadingSpinner fullScreen message='Loading messages...' />}
    >
      <MessagesPageContent />
    </Suspense>
  );
}

function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  const { isOtherTyping, broadcastTyping } = useTypingIndicator({
    channelId: selectedConversation?.id ?? null,
    userId: user?.id ?? null,
  });

  // Fetch conversations via React Query
  const { data: conversations = [], isLoading: loadingConversations } =
    useQuery<Conversation[]>({
      queryKey: ['messages', 'threads', user?.id],
      queryFn: () => fetchThreads(user!.id),
      enabled: !!user,
      meta: {
        onError: () => {
          toast.error('Failed to load conversations');
        },
      },
    });

  // Auto-select conversation from URL params when conversations load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      const targetJobId = searchParams.get('jobId');
      if (targetJobId) {
        const match = conversations.find(
          (c: Conversation) => c.id === targetJobId
        );
        if (match) setSelectedConversation(match);
      }
    }
  }, [conversations, searchParams, selectedConversation]);

  // Fetch messages for selected conversation via React Query
  const { data: messages = [], isLoading: loadingMessages } = useQuery<
    Message[]
  >({
    queryKey: ['messages', 'thread', selectedConversation?.id],
    queryFn: () => fetchThreadMessages(selectedConversation!.id),
    enabled: !!selectedConversation,
    meta: {
      onError: () => {
        toast.error('Failed to load messages');
      },
    },
  });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !user || sending)
      return;

    if (!csrfToken) {
      toast.error('Security token not available. Please refresh the page.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(
        `/api/messages/threads/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({
            content: messageInput.trim(),
            messageType: 'text',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to send message' }));
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      const newMessage: Message = {
        id: data.message?.id || Date.now().toString(),
        sender_id: user.id,
        content: messageInput.trim(),
        message_type: 'text',
        created_at: new Date().toISOString(),
        read: false,
      };

      // Optimistically update messages cache
      queryClient.setQueryData<Message[]>(
        ['messages', 'thread', selectedConversation.id],
        (old = []) => [...old, newMessage]
      );

      // Update conversation list's last message
      queryClient.setQueryData<Conversation[]>(
        ['messages', 'threads', user.id],
        (old = []) =>
          old.map((conv) =>
            conv.id === selectedConversation.id
              ? {
                  ...conv,
                  lastMessage: {
                    text: newMessage.content,
                    timestamp: newMessage.created_at,
                    read: false,
                  },
                }
              : conv
          )
      );

      setMessageInput('');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/messages');
    }
  }, [user, loadingUser, router]);

  // Phase-2 chrome fit: when Mint Editorial is active, the sidebar
  // already has a "Messages" entry, so the per-page "Back to Dashboard"
  // button is redundant. SSR renders the legacy variant; after mount
  // we re-render without the back button if the theme is on.
  //
  // CRITICAL: these hooks must live BEFORE the early returns below.
  // The previous order (early-returns first, then useState+useEffect)
  // violated the React rules-of-hooks — once `user` flipped from null
  // to defined, the hook call chain grew and React threw an
  // unrecoverable error, which the component-level ErrorBoundary
  // caught as "Something went wrong".
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (loadingUser) {
    return <LoadingSpinner fullScreen message='Loading messages...' />;
  }

  if (!user) return null;

  // Mint Editorial branch — canonical port from
  // design-system/project/redesign-v2/homeowner-screens.jsx lines 301-408.
  // The legacy branch below stays for users on the default theme.
  if (isMintEditorial) {
    return (
      <HomeownerPageWrapper>
        <div className='between' style={{ marginBottom: 14 }}>
          <div className='col' style={{ gap: 4 }}>
            <h1 className='t-h1'>Messages</h1>
            <p className='t-body'>
              Conversations with your contractors — quotes, scheduling,
              sign-off.
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            height: 'calc(100vh - 220px)',
            background: 'var(--me-surface)',
            border: '1px solid var(--me-line)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <MintEditorialMessagesSidebar
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loadingConversations}
          />
          {selectedConversation ? (
            <MintEditorialMessagesChat
              conversation={selectedConversation}
              messages={messages}
              currentUserId={user.id}
              loadingMessages={loadingMessages}
              messageInput={messageInput}
              onMessageInputChange={(val: string) => {
                setMessageInput(val);
                broadcastTyping();
              }}
              onSendMessage={handleSendMessage}
              sending={sending}
              isTyping={isOtherTyping}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--me-bg-2)',
                color: 'var(--me-ink-3)',
                fontSize: 13,
                textAlign: 'center',
                padding: 24,
              }}
            >
              Pick a conversation on the left to see the thread.
            </div>
          )}
        </div>
      </HomeownerPageWrapper>
    );
  }

  return (
    <HomeownerPageWrapper>
      <button
        onClick={() => router.push('/dashboard')}
        className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4'
      >
        <ArrowLeft className='w-5 h-5' />
        <span className='font-medium'>Back to Dashboard</span>
      </button>

      <div className='h-[calc(100vh-120px)] flex bg-white border border-gray-200 rounded-xl overflow-hidden'>
        {/* Sidebar — full-width on mobile, fixed width on md+ */}
        <div
          className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}
        >
          <MessagesConversationSidebar
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filter={filter}
            onFilterChange={setFilter}
            loading={loadingConversations}
          />
        </div>

        {/* Main Chat Area — hidden on mobile when no conversation selected */}
        <div
          className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}
        >
          {selectedConversation ? (
            <>
              {/* Mobile back button */}
              <button
                onClick={() => setSelectedConversation(null)}
                className='md:hidden flex items-center gap-2 px-4 py-3 border-b border-gray-200 text-gray-600 hover:text-gray-900'
              >
                <ArrowLeft className='w-5 h-5' />
                <span className='font-medium text-sm'>
                  Back to conversations
                </span>
              </button>
              <MessagesChatArea
                conversation={selectedConversation}
                messages={messages}
                currentUserId={user.id}
                loadingMessages={loadingMessages}
                messageInput={messageInput}
                onMessageInputChange={(val: string) => {
                  setMessageInput(val);
                  broadcastTyping();
                }}
                onSendMessage={handleSendMessage}
                sending={sending}
                isTyping={isOtherTyping}
              />
            </>
          ) : (
            <MessagesEmptyState />
          )}
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}

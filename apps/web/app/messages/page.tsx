'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { LoadingSpinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ArrowLeft } from 'lucide-react';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { MessagesConversationSidebar } from './components/MessagesConversationSidebar';
import { MessagesChatArea } from './components/MessagesChatArea';
import { MessagesEmptyState } from './components/MessagesEmptyState';

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

export default function MessagesPage2025() {
  return (
    <ErrorBoundary componentName="MessagesPage">
      <MessagesPageContent />
    </ErrorBoundary>
  );
}

function MessagesPageContent() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch conversations from real API
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/messages/threads');
        if (!response.ok) throw new Error('Failed to fetch conversations');

        const data = await response.json();
        const transformedConversations: Conversation[] = (data.threads || []).map((thread: ApiThread) => {
          const otherParticipant = thread.participants.find((p: Participant) => p.id !== user.id);
          return {
            id: thread.jobId,
            otherUser: {
              id: otherParticipant?.id || '',
              name: otherParticipant?.name || 'Unknown User',
              avatar: otherParticipant?.profile_image_url,
              online: false,
            },
            lastMessage: thread.lastMessage ? {
              text: thread.lastMessage.content || thread.lastMessage.messageText || '',
              timestamp: thread.lastMessage.createdAt,
              read: true,
            } : {
              text: 'No messages yet',
              timestamp: new Date().toISOString(),
              read: true,
            },
            jobTitle: thread.jobTitle,
            unreadCount: thread.unreadCount || 0,
          };
        });

        setConversations(transformedConversations);
      } catch (error) {
        toast.error('Failed to load conversations');
      } finally {
        setLoadingConversations(false);
      }
    };

    fetchConversations();
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const response = await fetch(`/api/messages/threads/${selectedConversation.id}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');

        const data = await response.json();
        const transformedMessages = (data.messages || []).map((msg: ApiMessageResponse): Message => ({
          id: msg.id,
          sender_id: msg.senderId || msg.sender_id || '',
          content: msg.content || msg.messageText || '',
          message_type: msg.messageType || msg.message_type || 'text',
          created_at: msg.createdAt || msg.created_at || '',
          read: msg.read !== undefined ? msg.read : true,
        }));

        setMessages(transformedMessages);

        await fetch(`/api/messages/threads/${selectedConversation.id}/read`, {
          method: 'POST',
        });
      } catch (error) {
        toast.error('Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !user || sending) return;

    if (!csrfToken) {
      toast.error('Security token not available. Please refresh the page.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/messages/threads/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          content: messageInput.trim(),
          messageType: 'text',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
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

      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');

      setConversations(prev => prev.map(conv =>
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
      ));
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

  if (loadingUser) {
    return <LoadingSpinner fullScreen message="Loading messages..." />;
  }

  if (!user) return null;

  return (
    <HomeownerPageWrapper>
      {/* Back to Dashboard Button */}
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Dashboard</span>
      </button>

      <div className="h-[calc(100vh-120px)] flex bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Sidebar */}
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

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <MessagesChatArea
              conversation={selectedConversation}
              messages={messages}
              currentUserId={user.id}
              loadingMessages={loadingMessages}
              messageInput={messageInput}
              onMessageInputChange={setMessageInput}
              onSendMessage={handleSendMessage}
              sending={sending}
            />
          ) : (
            <MessagesEmptyState />
          )}
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}

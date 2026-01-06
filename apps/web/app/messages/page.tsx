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

// Type for API response
interface ApiMessage {
  id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  created_at: string;
  is_read?: boolean;
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

        // Transform threads to conversations
        const transformedConversations: Conversation[] = (data.threads || []).map((thread: unknown) => {
          const otherParticipant = thread.participants.find((p: unknown) => p.id !== user.id);
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

        const transformedMessages = (data.messages || []).map((msg: unknown): Message => ({
          id: msg.id,
          sender_id: msg.senderId || msg.sender_id,
          content: msg.content || msg.messageText || '',
          message_type: msg.messageType || msg.message_type || 'text',
          created_at: msg.createdAt || msg.created_at,
          read: msg.read !== undefined ? msg.read : true,
        }));

        setMessages(transformedMessages);

        // Mark as read
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

      // Update conversation last message
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

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'unread' && conv.unreadCount === 0) return false;
    if (filter === 'archived') return false; // No archive functionality yet
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return conv.otherUser.name.toLowerCase().includes(query) ||
             conv.jobTitle?.toLowerCase().includes(query) ||
             conv.lastMessage.text.toLowerCase().includes(query);
    }
    return true;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
        {/* Sidebar - 30% width */}
        <div className="w-[30%] border-r border-gray-200 flex flex-col">
          {/* Search & Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === 'unread'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('archived')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === 'archived'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Archived
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 mb-2 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-gray-500">No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-gray-100' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {conv.otherUser.avatar ? (
                      <img
                        src={conv.otherUser.avatar}
                        alt={conv.otherUser.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-teal-700 font-semibold text-sm">
                          {getInitials(conv.otherUser.name)}
                        </span>
                      </div>
                    )}
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{conv.unreadCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">
                        {conv.otherUser.name}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTime(conv.lastMessage.timestamp)}
                      </span>
                    </div>
                    {conv.jobTitle && (
                      <p className="text-xs text-teal-600 mb-0.5 truncate">{conv.jobTitle}</p>
                    )}
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                      {conv.lastMessage.text}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area - 70% width */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  {selectedConversation.otherUser.avatar ? (
                    <img
                      src={selectedConversation.otherUser.avatar}
                      alt={selectedConversation.otherUser.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <span className="text-teal-700 font-semibold text-sm">
                        {getInitials(selectedConversation.otherUser.name)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedConversation.otherUser.name}</h2>
                    {selectedConversation.jobTitle && (
                      <button
                        onClick={() => router.push(`/jobs/${selectedConversation.id}`)}
                        className="text-sm text-teal-600 hover:underline"
                      >
                        {selectedConversation.jobTitle}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner message="Loading messages..." />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-gray-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isCurrentUser = message.sender_id === user.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {!isCurrentUser && (
                          <div className="w-8 h-8 flex-shrink-0">
                            {selectedConversation.otherUser.avatar ? (
                              <img
                                src={selectedConversation.otherUser.avatar}
                                alt={selectedConversation.otherUser.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                                <span className="text-teal-700 font-semibold text-xs">
                                  {getInitials(selectedConversation.otherUser.name)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className={`max-w-md ${isCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
                          <div
                            className={`px-4 py-2.5 rounded-2xl ${
                              isCurrentUser
                                ? 'bg-teal-600 text-white rounded-br-sm'
                                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                          <div
                            className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                              isCurrentUser ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span>{formatMessageTime(message.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Bar */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>

                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  />

                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sending}
                    className="p-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h2>
              <p className="text-gray-600 max-w-md">
                Choose a conversation from the left to start messaging with contractors
              </p>
            </div>
          )}
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}

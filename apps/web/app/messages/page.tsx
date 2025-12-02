'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { ConversationList2025 } from './components/ConversationList2025';
import { ChatInterface2025 } from './components/ChatInterface2025';
import { LoadingSpinner, ErrorView } from '@/components/ui';
import { fadeIn } from '@/lib/animations/variants';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MessageListSkeleton } from '@/components/ui/skeletons';

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
  reactions?: Array<{ emoji: string; userId: string }>;
}

// Type for API response - fixes `: any` type safety issues
interface ApiMessage {
  id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  created_at: string;
  is_read?: boolean;
  reactions?: Array<{ emoji: string; user_id?: string; userId?: string } | string>;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/messages/conversations');
        if (!response.ok) throw new Error('Failed to fetch conversations');

        const data = await response.json();

        interface ConversationApiResponse {
          id: string;
          other_user_id: string;
          other_user_name: string;
          other_user_avatar?: string;
          other_user_online?: boolean;
          last_message?: string;
          last_message_time?: string;
          last_message_at?: string;
          is_read?: boolean;
          unread_count?: number;
          job_id?: string;
          job_title?: string;
        }

        // Transform API data to component format
        const transformedConversations: Conversation[] = (data.conversations || []).map((conv: ConversationApiResponse) => ({
          id: conv.id,
          otherUser: {
            id: conv.other_user_id,
            name: conv.other_user_name || 'Unknown User',
            avatar: conv.other_user_avatar,
            online: conv.other_user_online || false,
          },
          lastMessage: {
            text: conv.last_message || '',
            timestamp: conv.last_message_at || new Date().toISOString(),
            read: conv.is_read || false,
          },
          jobTitle: conv.job_title,
          unreadCount: conv.unread_count || 0,
        }));

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
        const response = await fetch(`/api/messages/${selectedConversation.id}`);
        if (!response.ok) throw new Error('Failed to fetch messages');

        const data = await response.json();

        // Transform API data to match ChatInterface2025 Message format
        const transformedMessages = (data.messages || []).map((msg: ApiMessage): Message => ({
          id: msg.id,
          sender_id: msg.sender_id,
          content: msg.content,
          message_type: msg.message_type,
          created_at: msg.created_at,
          read: msg.is_read || false,
          reactions: msg.reactions?.map((r) => ({
            emoji: typeof r === 'string' ? r : r.emoji,
            userId: typeof r === 'string' ? '' : r.user_id || r.userId || '',
          })) || [],
        }));

        setMessages(transformedMessages);

        // Mark as read
        await fetch(`/api/messages/${selectedConversation.id}/read`, {
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

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !user) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          recipient_id: selectedConversation.otherUser.id,
          content,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Add message to local state
      const newMessage = {
        id: data.message.id,
        sender_id: user.id,
        content,
        message_type: 'text',
        created_at: new Date().toISOString(),
        read: false,
        reactions: [],
      };

      setMessages(prev => [...prev, newMessage]);

      // Update conversation last message
      setConversations(prev => prev.map(conv =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              lastMessage: {
                text: content,
                timestamp: new Date().toISOString(),
                read: false,
              },
            }
          : conv
      ));
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    try {
      await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });

      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, reactions: [...(msg.reactions || []), { emoji, userId: user.id }] }
          : msg
      ));
    } catch (error) {
      toast.error('Failed to add reaction');
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

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <UnifiedSidebar
        userRole={user.role}
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: 'profile_image_url' in user ? (user.profile_image_url as string | undefined) : undefined,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1800px] mx-auto px-8 py-8">
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-teal-100 mt-1">Chat with contractors and homeowners</p>
          </div>
        </MotionDiv>

        {/* Chat Container */}
        <div className="flex-1 max-w-[1800px] mx-auto px-8 py-6 w-full">
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden h-[calc(100vh-280px)]"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="grid grid-cols-12 h-full">
              {/* Conversations List - Left Column */}
              <div className="col-span-12 md:col-span-4 lg:col-span-3 border-r border-gray-200 h-full overflow-hidden">
                {loadingConversations ? (
                  <div className="p-4">
                    <MessageListSkeleton count={8} />
                  </div>
                ) : (
                  <ConversationList2025
                    conversations={conversations.map((conv) => ({
                      jobId: conv.id,
                      jobTitle: conv.jobTitle || 'No Job',
                      participants: [
                        {
                          id: user.id,
                          name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email,
                          profile_image_url: undefined,
                        },
                        {
                          id: conv.otherUser.id,
                          name: conv.otherUser.name,
                          profile_image_url: conv.otherUser.avatar,
                        },
                      ],
                      lastMessage: conv.lastMessage ? {
                        senderId: conv.otherUser.id,
                        messageText: conv.lastMessage.text,
                        content: conv.lastMessage.text,
                        createdAt: conv.lastMessage.timestamp,
                      } : undefined,
                      unreadCount: conv.unreadCount,
                    }))}
                    currentUserId={user.id}
                    onConversationClick={(thread) => {
                      const conv = conversations.find(c => c.id === thread.jobId);
                      if (conv) setSelectedConversation(conv);
                    }}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                  />
                )}
              </div>

              {/* Chat Interface - Right Column */}
              <div className="col-span-12 md:col-span-8 lg:col-span-9 h-full">
                {selectedConversation ? (
                  loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <LoadingSpinner message="Loading messages..." />
                    </div>
                  ) : (
                    <ChatInterface2025
                      messages={messages}
                      currentUserId={user.id}
                      otherUser={{
                        id: selectedConversation.otherUser.id,
                        name: selectedConversation.otherUser.name,
                        avatar: selectedConversation.otherUser.avatar,
                        isOnline: selectedConversation.otherUser.online,
                      }}
                      jobTitle={selectedConversation.jobTitle || 'No Job'}
                      onSendMessage={handleSendMessage}
                      onAddReaction={handleReaction}
                      isTyping={isTyping}
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8">
                    <div className="w-32 h-32 bg-teal-100 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-16 h-16 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a conversation</h2>
                    <p className="text-gray-600 max-w-md">
                      Choose a conversation from the left to start messaging with contractors or homeowners
                    </p>
                  </div>
                )}
              </div>
            </div>
          </MotionDiv>
        </div>
      </main>
    </div>
  );
}

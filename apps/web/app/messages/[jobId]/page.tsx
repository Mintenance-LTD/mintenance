'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MessageInput } from '@/components/messaging/MessageInput';
import { MessagingService } from '@/lib/services/MessagingService';
import { useRealTimeMessages } from '@/hooks/useRealTimeMessages';
import { logger } from '@/lib/logger';
import type { Message, User } from '@mintenance/types';

interface ChatPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { jobId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Get params from URL
  const otherUserId = searchParams.get('userId');
  const otherUserName = searchParams.get('userName');
  const jobTitle = searchParams.get('jobTitle');

  useEffect(() => {
    loadUserAndMessages();
  }, [jobId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up real-time message subscription
  useRealTimeMessages(jobId, {
    enabled: !!user && !!jobId,
    onNewMessage: (newMessage) => {
      logger.info('Real-time new message received', { messageId: newMessage.id, jobId });
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        if (prev.some(msg => msg.id === newMessage.id)) {
          return prev;
        }
        const updated = [...prev, newMessage];
        // Auto-scroll to new message
        setTimeout(scrollToBottom, 100);
        return updated;
      });

      // Mark as read if it's from other user
      if (newMessage.senderId !== user?.id && user?.id) {
        MessagingService.markMessagesAsRead(jobId, user.id);
      }
    },
    onMessageUpdate: (updatedMessage) => {
      logger.info('Real-time message update received', { messageId: updatedMessage.id, jobId });
      setMessages(prev =>
        prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
      );
    },
    onError: (error) => {
      logger.error('Real-time messaging error', error);
    }
  });

  const loadUserAndMessages = async () => {
    try {
      setLoading(true);
      const currentUser = await fetchCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      // Load messages for this job
      const jobMessages = await MessagingService.getJobMessages(jobId);
      setMessages(jobMessages);

      // Mark messages as read
      await MessagingService.markMessagesAsRead(jobId, currentUser.id);
    } catch (err) {
      logger.error('Error loading chat', err);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText: string) => {
    if (!user || !otherUserId || sending) return;

    try {
      setSending(true);
      const newMessage = await MessagingService.sendMessage(
        jobId,
        otherUserId,
        messageText,
        user.id
      );

      // Add the new message to the local state
      setMessages(prev => [...prev, newMessage]);
      scrollToBottom();
    } catch (err) {
      logger.error('Error sending message', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach((message) => {
      const dateKey = new Date(message.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    return groups;
  };

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.md
          }}>
            Access Denied
          </h1>
          <p style={{
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing.lg
          }}>
            You must be logged in to view messages.
          </p>
          <Button
            onClick={() => router.push('/login')}
            variant="primary"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);
  const dateKeys = Object.keys(messageGroups).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.colors.backgroundSecondary
    }}>
      {/* Chat Header */}
      <div style={{
        backgroundColor: theme.colors.white,
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: theme.spacing.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            onClick={() => router.push('/messages')}
            variant="ghost"
            size="sm"
            style={{ marginRight: theme.spacing.sm }}
          >
            ← Back
          </Button>
          <div>
            <h1 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: '2px'
            }}>
              {otherUserName || 'Unknown User'}
            </h1>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0
            }}>
              📋 {jobTitle || 'Job Discussion'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <Button
            onClick={loadUserAndMessages}
            variant="ghost"
            size="sm"
            disabled={loading}
          >
            🔄
          </Button>
          <Button
            onClick={() => alert('Video call feature coming soon!')}
            variant="outline"
            size="sm"
          >
            📞 Call
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: theme.spacing.md,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px'
          }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              color: theme.colors.textSecondary
            }}>
              Loading messages...
            </div>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            textAlign: 'center'
          }}>
            <div style={{
              color: theme.colors.error,
              fontSize: theme.typography.fontSize.base,
              marginBottom: theme.spacing.md
            }}>
              {error}
            </div>
            <Button
              onClick={loadUserAndMessages}
              variant="outline"
              size="sm"
            >
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['4xl'],
              marginBottom: theme.spacing.md
            }}>
              💬
            </div>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.sm
            }}>
              Start the conversation
            </h3>
            <p style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm
            }}>
              Send a message to begin discussing this job.
            </p>
          </div>
        )}

        {!loading && !error && messages.length > 0 && (
          <div>
            {dateKeys.map((dateKey) => (
              <div key={dateKey}>
                {/* Date separator */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  margin: `${theme.spacing.lg} 0`,
                }}>
                  <div style={{
                    backgroundColor: theme.colors.backgroundTertiary,
                    color: theme.colors.textSecondary,
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.borderRadius.full,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    {formatDate(dateKey)}
                  </div>
                </div>

                {/* Messages for this date */}
                {messageGroups[dateKey].map((message, index, arrayOfMessages) => {
                  const isCurrentUser = message.senderId === user?.id;
                  const prevMessage = index > 0 ? arrayOfMessages[index - 1] : null;
                  const showSender = !prevMessage || prevMessage.senderId !== message.senderId;

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isCurrentUser={isCurrentUser}
                      showSender={showSender && !isCurrentUser}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div style={{ flexShrink: 0 }}>
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={sending || !otherUserId}
          placeholder={sending ? 'Sending...' : 'Type a message...'}
        />
      </div>
    </div>
  );
}
'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MessageSquare } from 'lucide-react';
import type { Message } from '@mintenance/types';

interface ChatMessagesAreaProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
  userId: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onRetry: () => void;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function groupMessagesByDate(msgs: Message[]) {
  const unique = Array.from(new Map(msgs.map((m) => [m.id, m])).values());
  const groups: Record<string, Message[]> = {};
  unique.forEach((msg) => {
    const key = new Date(msg.createdAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  });
  return groups;
}

export function ChatMessagesArea({
  messages,
  loading,
  error,
  userId,
  messagesEndRef,
  onRetry,
}: ChatMessagesAreaProps) {
  const messageGroups = groupMessagesByDate(messages);
  const dateKeys = Object.keys(messageGroups).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: theme.spacing.md,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
          }}
        >
          <div
            style={{
              fontSize: theme.typography.fontSize.lg,
              color: theme.colors.textSecondary,
            }}
          >
            Loading messages...
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: theme.colors.error,
              fontSize: theme.typography.fontSize.base,
              marginBottom: theme.spacing.md,
            }}
          >
            {error}
          </div>
          <Button onClick={onRetry} variant='outline' size='sm'>
            Try Again
          </Button>
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: theme.spacing.md }}>
            <MessageSquare size={64} className='text-gray-400' />
          </div>
          <h3
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.sm,
            }}
          >
            Start the conversation
          </h3>
          <p
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            Send a message to begin discussing this job.
          </p>
        </div>
      )}

      {!loading && !error && messages.length > 0 && (
        <div>
          {dateKeys.map((dateKey) => (
            <div key={dateKey}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  margin: `${theme.spacing.lg} 0`,
                }}
              >
                <div
                  style={{
                    backgroundColor: theme.colors.backgroundTertiary,
                    color: theme.colors.textSecondary,
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.borderRadius.full,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium,
                  }}
                >
                  {formatDate(dateKey)}
                </div>
              </div>
              {messageGroups[dateKey].map((message, index, arr) => {
                const isCurrentUser = message.senderId === userId;
                const prevMessage = index > 0 ? arr[index - 1] : null;
                const showSender =
                  !prevMessage || prevMessage.senderId !== message.senderId;
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

      <div ref={messagesEndRef} />
    </div>
  );
}

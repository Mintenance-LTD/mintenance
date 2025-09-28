'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { ConversationCard } from '@/components/messaging/ConversationCard';
import { MessagingService } from '@/lib/services/MessagingService';
import type { MessageThread, User } from '@mintenance/types';

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndMessages();
  }, []);

  const loadUserAndMessages = async () => {
    try {
      setLoading(true);
      const currentUser = await fetchCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);
      const userConversations = await MessagingService.getUserMessageThreads(currentUser.id);
      setConversations(userConversations);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversation: MessageThread) => {
    const otherParticipant = conversation.participants.find(
      (p) => p.id !== user?.id
    );

    if (otherParticipant) {
      router.push(`/messages/${conversation.jobId}?userId=${otherParticipant.id}&userName=${encodeURIComponent(otherParticipant.name)}&jobTitle=${encodeURIComponent(conversation.jobTitle)}`);
    }
  };

  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.backgroundSecondary
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: theme.spacing.lg
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.sm,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: '4px'
            }}>
              💬 Messages
            </h1>
            <p style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.base,
              margin: 0
            }}>
              {conversations.length > 0
                ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}${getTotalUnreadCount() > 0 ? ` (${getTotalUnreadCount()} unread)` : ''}`
                : 'No conversations yet'
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            <Button
              onClick={() => router.push('/jobs')}
              variant="outline"
              size="sm"
            >
              📋 View Jobs
            </Button>
            <Button
              onClick={loadUserAndMessages}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              🔄 Refresh
            </Button>
          </div>
        </div>

        {/* Messages Content */}
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.sm,
          overflow: 'hidden'
        }}>
          {loading && (
            <div style={{
              padding: theme.spacing.xl,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: theme.typography.fontSize.lg,
                color: theme.colors.textSecondary
              }}>
                Loading conversations...
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: theme.spacing.xl,
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

          {!loading && !error && conversations.length === 0 && (
            <div style={{
              padding: theme.spacing.xl,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: theme.typography.fontSize['5xl'],
                marginBottom: theme.spacing.lg
              }}>
                💬
              </div>
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                marginBottom: theme.spacing.md
              }}>
                No conversations yet
              </h3>
              <p style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing.lg,
                maxWidth: '500px',
                margin: `0 auto ${theme.spacing.lg}`
              }}>
                Start a conversation by posting a job or applying to jobs.
                Once you connect with contractors or homeowners, your conversations will appear here.
              </p>
              <div style={{
                display: 'flex',
                gap: theme.spacing.md,
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <Button
                  onClick={() => router.push('/jobs')}
                  variant="primary"
                >
                  📋 Browse Jobs
                </Button>
                <Button
                  onClick={() => router.push('/contractors')}
                  variant="outline"
                >
                  🔧 Find Contractors
                </Button>
                <Button
                  onClick={() => router.push('/discover')}
                  variant="outline"
                >
                  🔥 Discover & Swipe
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && conversations.length > 0 && (
            <div>
              {conversations.map((conversation) => (
                <ConversationCard
                  key={conversation.jobId}
                  conversation={conversation}
                  currentUserId={user.id}
                  onClick={() => handleConversationClick(conversation)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {!loading && !error && conversations.length > 0 && (
          <div style={{
            marginTop: theme.spacing.lg,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing.md
          }}>
            <div style={{
              backgroundColor: theme.colors.white,
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              boxShadow: theme.shadows.sm,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.primary
              }}>
                {conversations.length}
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary
              }}>
                Total Conversations
              </div>
            </div>
            <div style={{
              backgroundColor: theme.colors.white,
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              boxShadow: theme.shadows.sm,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: getTotalUnreadCount() > 0 ? theme.colors.error : theme.colors.success
              }}>
                {getTotalUnreadCount()}
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary
              }}>
                Unread Messages
              </div>
            </div>
            <div style={{
              backgroundColor: theme.colors.white,
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              boxShadow: theme.shadows.sm,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.secondary
              }}>
                {conversations.filter(c => c.lastMessage?.createdAt &&
                  new Date(c.lastMessage.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
                ).length}
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary
              }}>
                Active Today
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
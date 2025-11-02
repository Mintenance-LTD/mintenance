'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { MessagingService } from '@/lib/services/MessagingService';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import type { MessageThread, User } from '@mintenance/types';
import dynamic from 'next/dynamic';

// Dynamic import for ConversationCard to reduce initial bundle size
const ConversationCard = dynamic(() => import('@/components/messaging/ConversationCard').then(mod => ({ default: mod.ConversationCard })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-20 rounded-lg" />,
  ssr: false
});

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Messages | Mintenance';
  }, []);

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

  // Show loading state while checking authentication
  if (loading && !user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.textSecondary
          }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // Only show access denied after loading is complete and user is still null
  if (!loading && !user) {
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

  // user is guaranteed to be non-null at this point due to early returns above
  if (!user) {
    return null;
  }

  const userDisplayName = user.first_name && user.last_name 
    ? `${user.first_name} ${user.last_name}`.trim() 
    : user.email;

  return (
    <HomeownerLayoutShell 
      currentPath="/messages"
      userName={user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
      userEmail={user.email}
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing.lg
      }}>
        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={[
            { label: 'Home', href: '/' },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Messages', current: true }
          ]}
          style={{ marginBottom: theme.spacing[4] }}
        />

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
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: theme.spacing[1]
            }}>
              <Icon name="messages" size={28} color={theme.colors.primary} />
              Messages
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="briefcase" size={16} color="white" />
                <span>View Jobs</span>
              </div>
            </Button>
            <Button
              onClick={loadUserAndMessages}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="refresh" size={16} color={theme.colors.textPrimary} />
                <span>Refresh</span>
              </div>
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
            <EmptyState
              variant="default"
              icon={<Icon name="messages" size={64} color={theme.colors.textTertiary} />}
              title="No conversations yet"
              description="Start a conversation by posting a job or applying to jobs. Once you connect with contractors or homeowners, your conversations will appear here."
              action={{
                label: 'Browse Jobs',
                onClick: () => router.push('/jobs')
              }}
            />
          )}

          {!loading && !error && conversations.length > 0 && (
            <div>
              {conversations.map((conversation) => (
                <ConversationCard
                  key={conversation.jobId}
                  conversation={conversation}
                  currentUserId={user?.id || ''}
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
    </HomeownerLayoutShell>
  );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { MessageCircle, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { MessagingService } from '@/lib/services/MessagingService';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import type { MessageThread, User } from '@mintenance/types';
import { ConversationCard } from '@/components/messaging/ConversationCard';

export default function MessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
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

  // Reload conversations when navigating back to messages page
  // Use a ref to track the last pathname to avoid duplicate loads
  const lastPathnameRef = useRef<string | null>(null);
  useEffect(() => {
    // Only reload if we're on /messages and we just navigated here (not initial load)
    if (pathname === '/messages' && user && lastPathnameRef.current !== '/messages' && lastPathnameRef.current !== null) {
      // User navigated back to messages page, reload conversations
      loadUserAndMessages();
    }
    lastPathnameRef.current = pathname;
  }, [pathname, user]);

  // Reload conversations when page becomes visible (user returns from chat)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && pathname === '/messages') {
        // Reload conversations when user returns to the page
        loadUserAndMessages();
      }
    };

    const handleFocus = () => {
      if (user && pathname === '/messages') {
        // Also reload on window focus (e.g., switching tabs back)
        loadUserAndMessages();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, pathname]);

  const loadUserAndMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await fetchCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      // Redirect contractors to their own messages page
      if (currentUser.role === 'contractor') {
        router.push('/contractor/messages');
        return;
      }

      setUser(currentUser);
      console.log('[MessagesPage] Loading conversations for user:', currentUser.id);
      const userConversations = await MessagingService.getUserMessageThreads(currentUser.id);
      console.log('[MessagesPage] Loaded conversations:', userConversations.length, userConversations);
      setConversations(userConversations);
      
      if (userConversations.length === 0) {
        console.log('[MessagesPage] No conversations found. User ID:', currentUser.id, 'User role:', currentUser.role);
      }
    } catch (err) {
      console.error('[MessagesPage] Error loading messages:', err);
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

  // Categorize conversations - same logic as contractor
  const categorizeConversations = () => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const allConversations = conversations;
    // Ongoing = conversations with activity in the last 7 days (recently active)
    const ongoingConversations = conversations.filter(c => {
      if (c.lastMessage?.createdAt) {
        return new Date(c.lastMessage.createdAt).getTime() > sevenDaysAgo;
      }
      // If no messages but conversation exists, consider it ongoing
      return true;
    });
    const unreadConversations = conversations.filter(c => c.unreadCount > 0);
    const activeTodayConversations = conversations.filter(c => 
      c.lastMessage?.createdAt && 
      new Date(c.lastMessage.createdAt).getTime() > oneDayAgo
    );

    return {
      all: allConversations,
      ongoing: ongoingConversations,
      unread: unreadConversations,
      activeToday: activeTodayConversations,
    };
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
        padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing[6]}`
        // Top right bottom left padding - increased left padding to add space from sidebar
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

        {/* Header - Modern Design (matching contractor) */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-200 flex justify-between items-center group relative overflow-hidden">
          {/* Gradient bar - appears on hover, always visible on large screens */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-[640] text-gray-900 mb-2 tracking-tight">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                <MessageCircle className="h-6 w-6" style={{ color: theme.colors.primary }} />
              </div>
              Messages
            </h1>
            <p className="text-base font-[460] text-gray-600 m-0">
              {conversations.length > 0
                ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}${getTotalUnreadCount() > 0 ? ` • ${getTotalUnreadCount()} unread` : ''}`
                : 'No conversations yet'
              }
            </p>
          </div>
          <div className="flex gap-2 relative">
            <Button
              onClick={() => router.push('/jobs')}
              variant="secondary"
              size="sm"
              className="font-[560]"
              leftIcon={<Briefcase className="h-4 w-4 text-white" />}
            >
              View Jobs
            </Button>
          </div>
        </div>

        {/* Messages Content - Categorized Cards (matching contractor) */}
        {!loading && !error && conversations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Conversations Card */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden group relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-[560] text-gray-900">Total Conversations</h3>
                  <span className="text-2xl font-[640] text-primary-600">{conversations.length}</span>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {conversations.map((conversation) => (
                  <ConversationCard
                    key={conversation.jobId}
                    conversation={conversation}
                    currentUserId={user?.id || ''}
                    onClick={() => handleConversationClick(conversation)}
                  />
                ))}
              </div>
            </div>

            {/* Ongoing Conversations Card */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden group relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-[560] text-gray-900">Ongoing Conversations</h3>
                  <span className="text-2xl font-[640] text-primary-600">
                    {categorizeConversations().ongoing.length}
                  </span>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {categorizeConversations().ongoing.length > 0 ? (
                  categorizeConversations().ongoing.map((conversation) => (
                    <ConversationCard
                      key={conversation.jobId}
                      conversation={conversation}
                      currentUserId={user?.id || ''}
                      onClick={() => handleConversationClick(conversation)}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No active conversations. Click on a conversation to start.
                  </div>
                )}
              </div>
            </div>

            {/* Unread Messages Card */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden group relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-[560] text-gray-900">Unread Messages</h3>
                  <span className={`text-2xl font-[640] ${
                    categorizeConversations().unread.length > 0 ? 'text-error-DEFAULT' : 'text-success-DEFAULT'
                  }`}>
                    {categorizeConversations().unread.length}
                  </span>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {categorizeConversations().unread.length > 0 ? (
                  categorizeConversations().unread.map((conversation) => (
                    <ConversationCard
                      key={conversation.jobId}
                      conversation={conversation}
                      currentUserId={user?.id || ''}
                      onClick={() => handleConversationClick(conversation)}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    All caught up! No unread messages.
                  </div>
                )}
              </div>
            </div>

            {/* Active Today Card */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden group relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-[560] text-gray-900">Active Today</h3>
                  <span className="text-2xl font-[640] text-primary-600">
                    {categorizeConversations().activeToday.length}
                  </span>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {categorizeConversations().activeToday.length > 0 ? (
                  categorizeConversations().activeToday.map((conversation) => (
                    <ConversationCard
                      key={conversation.jobId}
                      conversation={conversation}
                      currentUserId={user?.id || ''}
                      onClick={() => handleConversationClick(conversation)}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No conversations active today.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading and Error States */}
        {loading && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-lg text-gray-600">
              Loading conversations...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-error-DEFAULT mb-4">
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
            icon="messages"
            title="No conversations yet"
            description="Start a conversation by posting a job or applying to jobs. Once you connect with contractors or homeowners, your conversations will appear here."
            actionLabel="Browse Jobs"
            onAction={() => router.push('/jobs')}
          />
        )}
      </div>
    </HomeownerLayoutShell>
  );
}
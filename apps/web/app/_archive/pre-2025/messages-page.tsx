'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { MessageCircle, Briefcase, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { MessagingService } from '@/lib/services/MessagingService';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { PageHeader } from '@/components/layouts/PageHeader';
import type { User } from '@mintenance/types';

interface MessageThread {
  jobId: string;
  jobTitle: string;
  participants: Array<{
    id: string;
    name: string;
    role?: string;
    profile_image_url?: string;
  }>;
  lastMessage?: {
    senderId: string;
    messageText: string;
    messageType?: string;
    content?: string;
    createdAt: string;
  };
  unreadCount: number;
}
import { ConversationCard } from '@/components/messaging/ConversationCard';

export default function MessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Set page title
  useEffect(() => {
    document.title = 'Messages | Mintenance';
  }, []);

  useEffect(() => {
    loadUserAndMessages();
  }, []);

  // Reload conversations when navigating back to messages page
  const lastPathnameRef = useRef<string | null>(null);
  useEffect(() => {
    if (pathname === '/messages' && user && lastPathnameRef.current !== '/messages' && lastPathnameRef.current !== null) {
      loadUserAndMessages();
    }
    lastPathnameRef.current = pathname;
  }, [pathname, user]);

  // Reload conversations when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && pathname === '/messages') {
        loadUserAndMessages();
      }
    };

    const handleFocus = () => {
      if (user && pathname === '/messages') {
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

      if (currentUser.role === 'contractor') {
        router.push('/contractor/messages');
        return;
      }

      setUser(currentUser);
      const userConversations = await MessagingService.getUserMessageThreads(currentUser.id);
      setConversations(userConversations);
    } catch (err) {
      logger.error('[MessagesPage] Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversation: MessageThread) => {
    const otherParticipant = conversation.participants.find(
      (p: any) => p.id !== user?.id
    );

    if (otherParticipant) {
      router.push(`/messages/${conversation.jobId}?userId=${otherParticipant.id}&userName=${encodeURIComponent(otherParticipant.name)}&jobTitle=${encodeURIComponent(conversation.jobTitle)}`);
    }
  };

  const filteredConversations = conversations.filter((c: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const otherParticipant = c.participants.find((p: any) => p.id !== user?.id);
    return (
      c.jobTitle.toLowerCase().includes(query) ||
      otherParticipant?.name.toLowerCase().includes(query) ||
      c.lastMessage?.content.toLowerCase().includes(query)
    );
  });

  const getTotalUnreadCount = () => {
    return conversations.reduce((total: number, conv: any) => total + (conv.unreadCount || 0), 0);
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-teal-600">Loading...</div>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-500 mb-6">You must be logged in to view messages.</p>
          <Button onClick={() => router.push('/login')} variant="primary">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <UnifiedSidebar
        userRole="homeowner"
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: user.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        <PageHeader
          title="Messages"
          showSearch={true}
          darkBackground={true}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          userName={userDisplayName}
          userAvatar={user.profile_image_url}
        />

        <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          {/* Messages List */}
          {!loading && !error && conversations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              {/* Title and View Jobs Button */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '24px',
                borderBottom: '1px solid #E5E7EB'
              }}>
                <h2 className="text-3xl font-bold text-gray-900">Messages</h2>
                <button
                  onClick={() => router.push('/jobs')}
                  className="px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  View Jobs
                </button>
              </div>
              
              {/* Messages List */}
              <div style={{ padding: '0' }}>
                <div className="flex flex-col">
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conversation: any, index: number) => (
                      <div key={conversation.jobId}>
                        <ConversationCard
                          conversation={conversation}
                          currentUserId={user?.id || ''}
                          onClick={() => handleConversationClick(conversation)}
                        />
                        {index < filteredConversations.length - 1 && (
                          <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '0 24px' }} />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      No conversations match your search.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <div className="text-lg text-gray-600">Loading conversations...</div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-red-500 mb-4 font-medium">{error}</div>
              <Button onClick={loadUserAndMessages} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && conversations.length === 0 && (
            <div className="mt-8">
              <EmptyState
                variant="default"
                icon="messages"
                title="No conversations yet"
                description="Start a conversation by posting a job or applying to jobs. Once you connect with contractors or homeowners, your conversations will appear here."
                actionLabel="Browse Jobs"
                onAction={() => router.push('/jobs')}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
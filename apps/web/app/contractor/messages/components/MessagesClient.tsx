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
import type { MessageThread, User } from '@mintenance/types';
import dynamic from 'next/dynamic';
import { ActiveContractCard } from './ActiveContractCard';
import { CreateContractModal } from './CreateContractModal';

// Dynamic import for ConversationCard to reduce initial bundle size
const ConversationCard = dynamic(() => import('@/components/messaging/ConversationCard').then(mod => ({ default: mod.ConversationCard })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-20 rounded-lg" />,
  ssr: false
});

interface ActiveJob {
  id: string;
  title: string;
  homeowner: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_image_url: string | null;
  };
  contract: {
    id: string;
    status: string;
    contractor_signed_at: string | null;
    homeowner_signed_at: string | null;
  } | null;
}

export function MessagesClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<MessageThread[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobForContract, setSelectedJobForContract] = useState<string | null>(null);

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
      
      // Load conversations
      const userConversations = await MessagingService.getUserMessageThreads(currentUser.id);
      // Sort conversations by most recent message first
      const sortedConversations = [...userConversations].sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime; // Most recent first
      });
      setConversations(sortedConversations);

      // Load active jobs (assigned jobs for contractor)
      try {
        const jobsResponse = await fetch('/api/jobs?status[]=assigned&limit=50');
        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          const jobs = jobsData.jobs || [];

          // For each job, fetch contract info
          const jobsWithContracts = await Promise.all(
            jobs.map(async (job: any) => {
              const contractResponse = await fetch(`/api/contracts?job_id=${job.id}`);
              let contract = null;
              if (contractResponse.ok) {
                const contractData = await contractResponse.json();
                contract = contractData.contracts?.[0] || null;
              }

              return {
                id: job.id,
                title: job.title,
                homeowner: {
                  id: job.homeowner_id,
                  first_name: job.homeowner?.first_name || '',
                  last_name: job.homeowner?.last_name || '',
                  email: job.homeowner?.email || '',
                  profile_image_url: job.homeowner?.profile_image_url || null,
                },
                contract,
              };
            })
          );

          setActiveJobs(jobsWithContracts);
        }
      } catch (err) {
        console.error('Error loading active jobs:', err);
        // Don't fail the whole page if jobs fail to load
      }
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
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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

  return (
    <div style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: theme.spacing.lg
    }}>
      {/* Breadcrumbs */}
      <Breadcrumbs 
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/contractor/dashboard-enhanced' },
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
            onClick={() => router.push('/contractor/bid')}
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

      {/* Active Contracts Section */}
      {!loading && !error && activeJobs.length > 0 && (
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.sm,
          marginBottom: theme.spacing[6],
          overflow: 'hidden'
        }}>
          <div style={{
            padding: theme.spacing[6],
            borderBottom: `1px solid ${theme.colors.border}`,
          }}>
            <h2 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              margin: 0,
              marginBottom: theme.spacing[1],
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}>
              <Icon name="briefcase" size={24} color={theme.colors.primary} />
              Active Contracts
            </h2>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0,
            }}>
              Manage your accepted jobs and create contracts
            </p>
          </div>
          <div>
            {activeJobs.map((job) => (
              <ActiveContractCard
                key={job.id}
                job={job}
                contract={job.contract}
                onCreateContract={() => setSelectedJobForContract(job.id)}
                onViewMessages={() => {
                  router.push(`/messages/${job.id}?userId=${job.homeowner.id}&userName=${encodeURIComponent(`${job.homeowner.first_name} ${job.homeowner.last_name}`)}&jobTitle=${encodeURIComponent(job.title)}`);
                }}
              />
            ))}
          </div>
        </div>
      )}

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
            description="Start a conversation by bidding on jobs or connecting with homeowners. Once you connect, your conversations will appear here."
            action={{
              label: 'Browse Jobs',
              onClick: () => router.push('/contractor/bid')
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

      {/* Create Contract Modal */}
      {selectedJobForContract && (
        <CreateContractModal
          isOpen={!!selectedJobForContract}
          onClose={() => setSelectedJobForContract(null)}
          jobId={selectedJobForContract}
          jobTitle={activeJobs.find(j => j.id === selectedJobForContract)?.title || 'Contract'}
          onContractCreated={loadUserAndMessages}
        />
      )}
    </div>
  );
}


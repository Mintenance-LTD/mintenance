'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { MessageCircle, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { MessagingService } from '@/lib/services/MessagingService';
import type { MessageThread, User } from '@mintenance/types';
import { ConversationCard } from '@/components/messaging/ConversationCard';
import { ActiveContractCard } from './ActiveContractCard';
import { logger } from '@mintenance/shared';

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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<MessageThread[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Set page title - only on client to prevent hydration issues
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Messages | Mintenance';
    }
  }, []);

  useEffect(() => {
    loadUserAndMessages();
  }, []);

  // Track active conversation from URL
  useEffect(() => {
    // Check if we're currently viewing a conversation
    const jobIdMatch = pathname?.match(/\/messages\/([^/?]+)/);
    if (jobIdMatch) {
      setActiveConversationId(jobIdMatch[1]);
    } else {
      // If we're on the messages list page, clear active conversation
      setActiveConversationId(null);
    }
  }, [pathname]);

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
      
      // Fetch clients from accepted bids and create conversation threads if they don't exist
      try {
        const bidsResponse = await fetch(`/api/contractor/bids?status=accepted`);
        if (bidsResponse.ok) {
          const bidsData = await bidsResponse.json();
          interface JobData {
            id: string;
            homeowner_id?: string;
            title?: string;
            homeowner?: HomeownerData;
          }

          interface BidWithJob {
            jobs?: JobData | JobData[];
            created_at?: string;
            updated_at?: string;
          }

          interface HomeownerData {
            id: string;
            first_name?: string;
            last_name?: string;
            email?: string;
            name?: string;
            profile_image_url?: string | null;
          }

          const acceptedBids: BidWithJob[] = bidsData.bids || [];
          
          // Get unique homeowners from accepted bids
          const homeownerJobMap = new Map<string, { jobId: string; jobTitle: string; homeowner: HomeownerData; bidDate: string }>();
          
          acceptedBids.forEach((bid: BidWithJob) => {
            const job = Array.isArray(bid.jobs) ? bid.jobs[0] : bid.jobs;
            if (!job || !job.homeowner_id) return;
            
            const homeownerId = job.homeowner_id;
            const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
            
            // Only add if not already in conversations and this is the most recent bid for this homeowner
            const existingThread = userConversations.find(c => {
              const otherParticipant = c.participants.find(p => p.id === homeownerId);
              return otherParticipant !== undefined;
            });
            
            if (!existingThread) {
              const existing = homeownerJobMap.get(homeownerId);
              const bidDate = bid.created_at || bid.updated_at || new Date().toISOString();
              
              // Keep the most recent bid for each homeowner
              if (!existing || new Date(bidDate) > new Date(existing.bidDate)) {
                homeownerJobMap.set(homeownerId, {
                  jobId: job.id,
                  jobTitle: job.title || 'Untitled Job',
                  homeowner: {
                    id: homeownerId,
                    name: homeowner?.first_name && homeowner?.last_name
                      ? `${homeowner.first_name} ${homeowner.last_name}`
                      : homeowner?.email || 'Homeowner',
                    email: homeowner?.email || '',
                    profile_image_url: homeowner?.profile_image_url || null,
                  },
                  bidDate,
                });
              }
            }
          });
          
          // Create conversation threads for accepted bid clients
          const acceptedBidThreads: MessageThread[] = Array.from(homeownerJobMap.values()).map(({ jobId, jobTitle, homeowner, bidDate }) => ({
            jobId,
            jobTitle,
            participants: [
              {
                id: currentUser.id,
                name: (currentUser.first_name && currentUser.last_name
                  ? `${currentUser.first_name} ${currentUser.last_name}`
                  : currentUser.email || 'You') as string,
                role: currentUser.role || 'contractor',
              },
              {
                id: homeowner.id,
                name: (homeowner.name || 'Homeowner') as string,
                role: 'homeowner',
              },
            ],
            unreadCount: 0,
            lastMessage: undefined,
          }));
          
          // Merge with existing conversations, avoiding duplicates
          const existingJobIds = new Set(userConversations.map(c => c.jobId));
          const newThreads = acceptedBidThreads.filter(t => !existingJobIds.has(t.jobId));
          const allConversations = [...userConversations, ...newThreads];
          
          // Sort conversations by most recent activity first
          // For threads without messages, use a timestamp from bid date
          const bidTimestamps = new Map(Array.from(homeownerJobMap.entries()).map(([homeownerId, data]) => [data.jobId, new Date(data.bidDate).getTime()]));
          const sortedConversations = [...allConversations].sort((a, b) => {
            const aTime = a.lastMessage?.createdAt 
              ? new Date(a.lastMessage.createdAt).getTime() 
              : bidTimestamps.get(a.jobId) || 0;
            const bTime = b.lastMessage?.createdAt 
              ? new Date(b.lastMessage.createdAt).getTime() 
              : bidTimestamps.get(b.jobId) || 0;
            return bTime - aTime; // Most recent first
          });
          setConversations(sortedConversations);
        } else {
          // Fallback to just existing conversations if bids fetch fails
          const sortedConversations = [...userConversations].sort((a, b) => {
            const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return bTime - aTime;
          });
          setConversations(sortedConversations);
        }
      } catch (bidsErr) {
        logger.error('Error loading accepted bids:', bidsErr);
        // Fallback to just existing conversations
        const sortedConversations = [...userConversations].sort((a, b) => {
          const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        setConversations(sortedConversations);
      }

      // Load active jobs (assigned jobs for contractor)
      try {
        const jobsResponse = await fetch('/api/jobs?status[]=assigned&limit=50');
        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          const jobs = jobsData.jobs || [];

          interface ActiveJobData {
            id: string;
            title?: string;
            status?: string;
            homeowner_id?: string;
            homeowner?: {
              first_name?: string;
              last_name?: string;
              email?: string;
              profile_image_url?: string | null;
            };
          }

          // For each job, fetch contract info
          const jobsWithContracts = await Promise.all(
            jobs.map(async (job: ActiveJobData) => {
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
                  id: job.homeowner_id || '',
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
        logger.error('Error loading active jobs:', err);
        // Don't fail the whole page if jobs fail to load
      }
    } catch (err) {
      logger.error('Error loading messages:', err);
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
      setActiveConversationId(conversation.jobId);
      router.push(`/messages/${conversation.jobId}?userId=${otherParticipant.id}&userName=${encodeURIComponent(otherParticipant.name)}&jobTitle=${encodeURIComponent(conversation.jobTitle)}`);
    }
  };

  // Categorize conversations
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

  // Show loading state with skeleton loader while checking authentication
  if (loading && !user) {
    return (
      <div style={{
        maxWidth: '1440px',
        padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing[6]}`
      }}>
        {/* Breadcrumbs Skeleton */}
        <div style={{
          marginBottom: theme.spacing[4],
          display: 'flex',
          gap: theme.spacing[2],
          alignItems: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '20px',
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
          <div style={{
            width: '80px',
            height: '20px',
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
        </div>

        {/* Header Skeleton */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
          marginBottom: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            marginBottom: theme.spacing[2]
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.lg,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{
              width: '200px',
              height: '32px',
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
          </div>
          <div style={{
            width: '300px',
            height: '20px',
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
        </div>

        {/* Content Skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: theme.spacing[6]
        }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              backgroundColor: '#FFFFFF',
              borderRadius: theme.borderRadius.xl,
              border: `1px solid ${theme.colors.border}`,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: theme.spacing[4],
                borderBottom: `1px solid ${theme.colors.border}`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    width: '150px',
                    height: '24px',
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.borderRadius.md,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }} />
                  <div style={{
                    width: '40px',
                    height: '32px',
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.borderRadius.md,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }} />
                </div>
              </div>
              <div style={{ padding: theme.spacing[4] }}>
                {[1, 2, 3].map((j) => (
                  <div key={j} style={{
                    marginBottom: theme.spacing[3],
                    display: 'flex',
                    gap: theme.spacing[3],
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: theme.colors.backgroundSecondary,
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        width: '120px',
                        height: '16px',
                        backgroundColor: theme.colors.backgroundSecondary,
                        borderRadius: theme.borderRadius.md,
                        marginBottom: theme.spacing[1],
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                      <div style={{
                        width: '180px',
                        height: '14px',
                        backgroundColor: theme.colors.backgroundSecondary,
                        borderRadius: theme.borderRadius.md,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
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
      padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing[6]}`
      // Top right bottom left padding - increased left padding to add space from sidebar
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

      {/* Header - Modern Design */}
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
            onClick={() => router.push('/contractor/bid')}
            variant="secondary"
            size="sm"
            className="font-[560]"
            leftIcon={<Briefcase className="h-4 w-4 text-white" />}
          >
            View Jobs
          </Button>
        </div>
      </div>

      {/* Active Contracts Section - Modern Design */}
      {!loading && !error && activeJobs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden group relative">
          {/* Gradient bar - appears on hover, always visible on large screens */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-[560] text-gray-900 mb-1 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center">
                <Briefcase className="h-[18px] w-[18px]" style={{ color: theme.colors.primary }} />
              </div>
              Active Contracts
            </h2>
            <p className="text-sm font-[460] text-gray-600 m-0 mt-1">
              Manage your accepted jobs and create contracts
            </p>
          </div>
          <div>
            {activeJobs.map((job) => (
              <ActiveContractCard
                key={job.id}
                job={job}
                contract={job.contract}
                onCreateContract={() => {
                  // Navigate to the message page instead - user can create contract from there
                  router.push(`/messages/${job.id}?userId=${job.homeowner.id}&userName=${encodeURIComponent(`${job.homeowner.first_name} ${job.homeowner.last_name}`)}&jobTitle=${encodeURIComponent(job.title)}`);
                }}
                onViewMessages={() => {
                  router.push(`/messages/${job.id}?userId=${job.homeowner.id}&userName=${encodeURIComponent(`${job.homeowner.first_name} ${job.homeowner.last_name}`)}&jobTitle=${encodeURIComponent(job.title)}`);
                }}
                onViewJob={() => {
                  // Navigate to contractor job detail page where they can sign the contract
                  router.push(`/contractor/jobs/${job.id}`);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Messages Content - Categorized Cards */}
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
      {loading && user && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: theme.spacing[6]
        }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              backgroundColor: '#FFFFFF',
              borderRadius: theme.borderRadius.xl,
              border: `1px solid ${theme.colors.border}`,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: theme.spacing[4],
                borderBottom: `1px solid ${theme.colors.border}`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    width: '150px',
                    height: '24px',
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.borderRadius.md,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }} />
                  <div style={{
                    width: '40px',
                    height: '32px',
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.borderRadius.md,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }} />
                </div>
              </div>
              <div style={{ padding: theme.spacing[4] }}>
                {[1, 2, 3].map((j) => (
                  <div key={j} style={{
                    marginBottom: theme.spacing[3],
                    display: 'flex',
                    gap: theme.spacing[3],
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: theme.colors.backgroundSecondary,
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        width: '120px',
                        height: '16px',
                        backgroundColor: theme.colors.backgroundSecondary,
                        borderRadius: theme.borderRadius.md,
                        marginBottom: theme.spacing[1],
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                      <div style={{
                        width: '180px',
                        height: '14px',
                        backgroundColor: theme.colors.backgroundSecondary,
                        borderRadius: theme.borderRadius.md,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
          description="Start a conversation by bidding on jobs or connecting with homeowners. Once you connect, your conversations will appear here."
          actionLabel="Browse Jobs"
          onAction={() => router.push('/contractor/bid')}
        />
      )}


    </div>
  );
}


/**
 * Onboarding System Usage Examples
 * Real-world examples of how to integrate the onboarding system
 */

'use client';

import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import {
  OnboardingWrapper,
  FeatureTooltip,
  ProfileCompletionCard,
  FirstUseEmptyState,
  FeatureAnnouncement,
  useFeatureAnnouncements,
} from '@/components/onboarding';
import { trackOnboardingStarted, trackProfileCompletion } from '@/lib/onboarding/analytics';

/**
 * Example 1: Dashboard Integration
 */
export function DashboardWithOnboarding({ user }: { user: any }) {
  const {
    complete,
    startOnboarding,
    progress,
    getProfileCompletionItems,
    getProfileCompletion
  } = useOnboarding({
    userType: user?.role || 'homeowner',
  });

  const items = getProfileCompletionItems(user);
  const completion = getProfileCompletion(user);

  // Track profile completion milestones
  React.useEffect(() => {
    if (completion === 100) {
      trackProfileCompletion(100, items.filter(i => i.completed).map(i => i.id));
    }
  }, [completion]);

  return (
    <div className="p-6">
      {/* Profile completion card in sidebar */}
      {completion < 100 && (
        <div className="mb-6">
          <ProfileCompletionCard
            items={items}
            userType={user?.role}
          />
        </div>
      )}

      {/* Tutorial restart button */}
      {complete && (
        <button
          onClick={() => {
            trackOnboardingStarted(user?.role);
            startOnboarding();
          }}
          className="mb-4 text-blue-600 hover:text-blue-700"
          data-onboarding="restart-tutorial"
        >
          Restart Tutorial ({Math.round(progress * 100)}% complete)
        </button>
      )}

      {/* Dashboard content */}
      <div data-onboarding="dashboard-kpis">
        {/* KPI cards */}
      </div>
    </div>
  );
}

/**
 * Example 2: Jobs List with Empty State
 */
export function JobsListWithEmptyState({ jobs, user }: { jobs: any[]; user: any }) {
  if (jobs.length === 0) {
    return (
      <FirstUseEmptyState
        type={user?.role === 'contractor' ? 'no-jobs-contractor' : 'no-jobs-homeowner'}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {jobs.map(job => (
        <div key={job.id}>{/* Job card */}</div>
      ))}
    </div>
  );
}

/**
 * Example 3: Feature with Tooltip
 */
export function VideoCallButtonWithTooltip() {
  return (
    <FeatureTooltip
      feature="video-calls"
      title="Try Video Calls!"
      description="Meet contractors face-to-face before hiring. Schedule a call right from the chat."
      actionLabel="Learn More"
      onAction={() => window.open('/help/video-calls', '_blank')}
      requireCompletion={50} // Only show if profile is 50%+ complete
    >
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        data-onboarding="video-call-button"
      >
        Schedule Video Call
      </button>
    </FeatureTooltip>
  );
}

/**
 * Example 4: App with Feature Announcements
 */
export function AppWithAnnouncements({ children }: { children: React.ReactNode }) {
  const announcements = [
    {
      id: 'v2.1.0-ai-search',
      version: '2.1.0',
      title: 'Introducing AI-Powered Search',
      description: 'Find contractors faster than ever with our new intelligent search system.',
      features: [
        {
          title: 'Natural Language Search',
          description: 'Just describe what you need in plain English',
          icon: '🔍',
        },
        {
          title: 'Smart Filters',
          description: 'AI understands your preferences and refines results',
          icon: '🎯',
        },
        {
          title: 'Personalized Rankings',
          description: 'Results ranked based on your past interactions',
          icon: '⭐',
        },
      ],
      media: {
        type: 'gif' as const,
        url: '/assets/announcements/ai-search-demo.gif',
        alt: 'AI Search Demo',
      },
      actions: [
        {
          label: 'Try It Now',
          href: '/search',
          variant: 'primary' as const,
        },
      ],
      releaseDate: '2025-01-15T00:00:00Z',
    },
    {
      id: 'v2.2.0-video-calls',
      version: '2.2.0',
      title: 'Video Calls Are Here!',
      description: 'Meet contractors virtually before hiring. No third-party apps needed.',
      features: [
        {
          title: 'HD Video & Audio',
          description: 'Crystal clear communication',
          icon: '🎥',
        },
        {
          title: 'Screen Sharing',
          description: 'Share photos and documents during calls',
          icon: '📱',
        },
        {
          title: 'Call Recording',
          description: 'Record important discussions (with permission)',
          icon: '🎬',
        },
      ],
      releaseDate: '2025-02-01T00:00:00Z',
    },
  ];

  const { currentAnnouncement, dismissAnnouncement } = useFeatureAnnouncements(announcements);

  return (
    <>
      {children}

      {currentAnnouncement && (
        <FeatureAnnouncement
          announcement={currentAnnouncement}
          onDismiss={dismissAnnouncement}
          onLearnMore={() => {
            window.open('/blog/whats-new', '_blank');
          }}
        />
      )}
    </>
  );
}

/**
 * Example 5: Root Layout with Onboarding
 */
export function RootLayoutWithOnboarding({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any;
}) {
  return (
    <OnboardingWrapper
      userType={user?.role || 'homeowner'}
      autoStart={!user?.onboarding_completed}
    >
      <AppWithAnnouncements>
        {children}
      </AppWithAnnouncements>
    </OnboardingWrapper>
  );
}

/**
 * Example 6: Contractor Profile with Completion
 */
export function ContractorProfileWithCompletion({ contractor }: { contractor: any }) {
  const { getProfileCompletionItems } = useOnboarding({
    userType: 'contractor',
  });

  const items = getProfileCompletionItems({
    profile_photo: contractor.profile_photo,
    business_name: contractor.business_name,
    bio: contractor.bio,
    skills_count: contractor.skills?.length || 0,
    service_radius: contractor.service_radius,
    portfolio_count: contractor.portfolio?.length || 0,
    is_verified: contractor.is_verified,
  });

  return (
    <div className="space-y-6">
      {/* Profile completion widget */}
      <ProfileCompletionCard
        items={items}
        userType="contractor"
        compact={false}
      />

      {/* Profile content */}
      <div>{/* Profile details */}</div>
    </div>
  );
}

/**
 * Example 7: Messages with Empty State
 */
export function MessagesWithEmptyState({ conversations }: { conversations: any[] }) {
  if (conversations.length === 0) {
    return <FirstUseEmptyState type="no-messages" />;
  }

  return (
    <div>
      {conversations.map(conv => (
        <div key={conv.id}>{/* Conversation item */}</div>
      ))}
    </div>
  );
}

/**
 * Example 8: Properties with Empty State
 */
export function PropertiesWithEmptyState({ properties }: { properties: any[] }) {
  if (properties.length === 0) {
    return <FirstUseEmptyState type="no-properties" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map(property => (
        <div key={property.id}>{/* Property card */}</div>
      ))}
    </div>
  );
}

/**
 * Example 9: Custom Empty State
 */
export function CustomEmptyState() {
  return (
    <FirstUseEmptyState
      type="no-jobs-homeowner"
      title="Custom Title"
      description="Custom description for your use case"
      actions={[
        {
          label: 'Custom Action',
          href: '/custom-route',
          variant: 'primary',
        },
      ]}
      tips={[
        {
          icon: require('lucide-react').Sparkles,
          text: 'Custom tip 1',
        },
        {
          icon: require('lucide-react').BookOpen,
          text: 'Custom tip 2',
        },
      ]}
    />
  );
}

/**
 * Example 10: Analytics Integration
 */
export function ComponentWithAnalytics() {
  const { currentStep, completeStep } = useOnboarding({
    userType: 'homeowner',
  });

  const [stepStartTime] = React.useState(Date.now());

  const handleComplete = () => {
    const timeSpent = Date.now() - stepStartTime;

    // Track with built-in analytics
    import('@/lib/onboarding/analytics').then(({ trackStepCompleted }) => {
      if (currentStep) {
        trackStepCompleted(currentStep.id, timeSpent, 0);
      }
    });

    completeStep();
  };

  return (
    <button onClick={handleComplete}>
      Complete Step
    </button>
  );
}

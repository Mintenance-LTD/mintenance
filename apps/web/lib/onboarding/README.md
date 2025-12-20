# Onboarding System

A comprehensive interactive onboarding and tutorial system for homeowners and contractors.

## Features

- **Interactive Tutorials**: Step-by-step spotlight tutorials with element highlighting
- **Everboarding**: Context-aware tooltips for feature discovery
- **Profile Completion**: LinkedIn-style progress tracking with celebrations
- **Empty States**: Encouraging first-use experiences with clear CTAs
- **Feature Announcements**: Version-gated "What's New" modals
- **Mobile Support**: Full React Native components for mobile apps
- **Analytics**: Comprehensive tracking of user progress and behavior

## Quick Start

### 1. Wrap Your App

```tsx
import { OnboardingWrapper } from '@/components/onboarding';

export default function RootLayout({ children }) {
  return (
    <OnboardingWrapper userType="homeowner" autoStart={true}>
      {children}
    </OnboardingWrapper>
  );
}
```

### 2. Use the Hook

```tsx
import { useOnboarding } from '@/hooks/useOnboarding';

function Dashboard() {
  const {
    isActive,
    currentStep,
    progress,
    complete,
    startOnboarding,
    completeStep,
    skip,
  } = useOnboarding({ userType: 'homeowner' });

  return (
    <div>
      {!complete && (
        <button onClick={startOnboarding}>
          Start Tutorial ({Math.round(progress * 100)}% complete)
        </button>
      )}
    </div>
  );
}
```

### 3. Add Feature Tooltips

```tsx
import { FeatureTooltip } from '@/components/onboarding';

<FeatureTooltip
  feature="video-calls"
  title="Try Video Calls!"
  description="Meet contractors face-to-face before hiring."
  actionLabel="Schedule Call"
  onAction={() => router.push('/video-calls')}
>
  <VideoCallButton />
</FeatureTooltip>
```

### 4. Show Profile Completion

```tsx
import { ProfileCompletionCard } from '@/components/onboarding';

function Sidebar({ user }) {
  const { getProfileCompletionItems, getProfileCompletion } = useOnboarding({
    userType: 'homeowner',
  });

  const items = getProfileCompletionItems(user);
  const completion = getProfileCompletion(user);

  return (
    <ProfileCompletionCard
      items={items}
      userType="homeowner"
      onItemClick={(item) => router.push(item.action)}
    />
  );
}
```

### 5. Use Empty States

```tsx
import { FirstUseEmptyState } from '@/components/onboarding';

function JobsList({ jobs }) {
  if (jobs.length === 0) {
    return <FirstUseEmptyState type="no-jobs-homeowner" />;
  }

  return <JobsGrid jobs={jobs} />;
}
```

### 6. Announce New Features

```tsx
import { FeatureAnnouncement, useFeatureAnnouncements } from '@/components/onboarding';

function App() {
  const announcements = [
    {
      id: 'v2.1.0',
      version: '2.1.0',
      title: 'Introducing AI Search',
      description: 'Find contractors faster with our new AI-powered search.',
      features: [
        {
          title: 'Smart Filters',
          description: 'AI understands your natural language queries',
          icon: '🔍',
        },
      ],
      releaseDate: '2025-01-15',
    },
  ];

  const { currentAnnouncement, dismissAnnouncement } = useFeatureAnnouncements(announcements);

  return (
    <>
      {currentAnnouncement && (
        <FeatureAnnouncement
          announcement={currentAnnouncement}
          onDismiss={dismissAnnouncement}
        />
      )}
    </>
  );
}
```

## Mobile Usage (React Native)

```tsx
import {
  OnboardingSwiper,
  homeownerSlides,
  ProfileCompletionCard,
  FeatureTooltip,
} from '@/components/onboarding';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <>
      {showOnboarding ? (
        <OnboardingSwiper
          slides={homeownerSlides}
          onComplete={() => setShowOnboarding(false)}
        />
      ) : (
        <MainApp />
      )}
    </>
  );
}
```

## Analytics

Track onboarding metrics:

```tsx
import {
  trackOnboardingStarted,
  trackStepCompleted,
  trackOnboardingCompleted,
  trackProfileCompletion,
} from '@/lib/onboarding/analytics';

// Track when user starts
trackOnboardingStarted('homeowner');

// Track each step
trackStepCompleted('profile-setup', 45000, 0); // 45s spent

// Track completion
trackOnboardingCompleted(300000, 8); // 5min total, 8 steps

// Track profile progress
trackProfileCompletion(75, ['photo', 'bio', 'location']);
```

## Customization

### Custom Flow

```tsx
import { OnboardingFlow } from '@/lib/onboarding/flows';

const customFlow: OnboardingFlow = {
  id: 'custom-flow',
  name: 'Custom Onboarding',
  userType: 'homeowner',
  estimatedMinutes: 3,
  steps: [
    {
      id: 'step-1',
      title: 'Welcome!',
      description: 'Let\'s get started.',
      skippable: true,
    },
    // ... more steps
  ],
};
```

### Custom Profile Items

```tsx
const customItems: ProfileCompletionItem[] = [
  {
    id: 'custom-item',
    label: 'Complete custom task',
    weight: 20,
    completed: false,
    action: '/custom-page',
  },
];

<ProfileCompletionCard items={customItems} />
```

## Data Attributes for Targeting

Add data attributes to elements you want to highlight:

```tsx
<button data-onboarding="create-job-button">
  Post Job
</button>

<div data-onboarding="job-form">
  <JobForm />
</div>
```

Then reference in flow:

```tsx
{
  id: 'post-job',
  targetSelector: '[data-onboarding="create-job-button"]',
  // ...
}
```

## Best Practices

1. **Keep it Short**: 5-8 steps maximum for initial onboarding
2. **Make it Skippable**: Always allow users to skip
3. **Show Value Early**: Get users to their "aha!" moment quickly
4. **Use Everboarding**: Show tooltips based on user behavior, not just first visit
5. **Celebrate Progress**: Use confetti and positive messaging
6. **Track Everything**: Monitor completion rates and drop-off points
7. **A/B Test**: Try different flows and messaging
8. **Accessibility**: Ensure keyboard navigation and screen reader support

## API Reference

See TypeScript types in:
- `/lib/onboarding/onboarding-state.ts`
- `/lib/onboarding/flows.ts`
- `/hooks/useOnboarding.ts`

## Testing

```tsx
import { resetOnboarding } from '@/lib/onboarding/onboarding-state';

// Reset onboarding state for testing
resetOnboarding();
```

## Support

For issues or questions, refer to the main documentation or contact the development team.

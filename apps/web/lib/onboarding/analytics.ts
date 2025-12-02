/**
 * Onboarding Analytics
 * Track user progress and behavior during onboarding
 */

import { logger } from '@mintenance/shared';

export interface OnboardingAnalyticsEvent {
  event: string;
  stepId?: string;
  userType: 'homeowner' | 'contractor';
  timestamp: string;
  properties?: Record<string, any>;
}

/**
 * Track onboarding event
 */
export function trackOnboardingEvent(
  event: string,
  stepId?: string,
  properties?: Record<string, any>
) {
  const userType = getUserType();

  const analyticsEvent: OnboardingAnalyticsEvent = {
    event,
    stepId,
    userType,
    timestamp: new Date().toISOString(),
    properties,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    logger.info('Onboarding Analytics:', analyticsEvent);
  }

  // Send to analytics service
  sendToAnalytics(analyticsEvent);

  // Store locally for debugging
  storeEventLocally(analyticsEvent);
}

/**
 * Track onboarding started
 */
export function trackOnboardingStarted(userType: 'homeowner' | 'contractor') {
  trackOnboardingEvent('onboarding_started', undefined, {
    userType,
    startTime: new Date().toISOString(),
  });
}

/**
 * Track step viewed
 */
export function trackStepViewed(stepId: string, stepIndex: number, totalSteps: number) {
  trackOnboardingEvent('step_viewed', stepId, {
    stepIndex,
    totalSteps,
    progress: ((stepIndex + 1) / totalSteps) * 100,
  });
}

/**
 * Track step completed
 */
export function trackStepCompleted(
  stepId: string,
  timeSpent: number,
  stepIndex: number
) {
  trackOnboardingEvent('step_completed', stepId, {
    timeSpent,
    stepIndex,
  });
}

/**
 * Track onboarding skipped
 */
export function trackOnboardingSkipped(
  currentStepId: string,
  stepIndex: number,
  totalSteps: number
) {
  trackOnboardingEvent('onboarding_skipped', currentStepId, {
    stepIndex,
    totalSteps,
    completionRate: (stepIndex / totalSteps) * 100,
  });
}

/**
 * Track onboarding completed
 */
export function trackOnboardingCompleted(totalTime: number, stepsCompleted: number) {
  trackOnboardingEvent('onboarding_completed', undefined, {
    totalTime,
    stepsCompleted,
    completedAt: new Date().toISOString(),
  });
}

/**
 * Track feature tooltip shown
 */
export function trackTooltipShown(featureId: string) {
  trackOnboardingEvent('tooltip_shown', undefined, {
    featureId,
  });
}

/**
 * Track feature tooltip dismissed
 */
export function trackTooltipDismissed(featureId: string, timeVisible: number) {
  trackOnboardingEvent('tooltip_dismissed', undefined, {
    featureId,
    timeVisible,
  });
}

/**
 * Track feature tooltip action clicked
 */
export function trackTooltipActionClicked(featureId: string, action: string) {
  trackOnboardingEvent('tooltip_action_clicked', undefined, {
    featureId,
    action,
  });
}

/**
 * Track feature adoption
 */
export function trackFeatureAdopted(featureId: string, daysAfterOnboarding: number) {
  trackOnboardingEvent('feature_adopted', undefined, {
    featureId,
    daysAfterOnboarding,
  });
}

/**
 * Track profile completion milestone
 */
export function trackProfileCompletion(
  completionPercentage: number,
  itemsCompleted: string[]
) {
  trackOnboardingEvent('profile_completion', undefined, {
    completionPercentage,
    itemsCompleted,
  });
}

/**
 * Track announcement shown
 */
export function trackAnnouncementShown(announcementId: string, version: string) {
  trackOnboardingEvent('announcement_shown', undefined, {
    announcementId,
    version,
  });
}

/**
 * Track announcement dismissed
 */
export function trackAnnouncementDismissed(
  announcementId: string,
  action: 'dismiss' | 'got_it' | 'learn_more'
) {
  trackOnboardingEvent('announcement_dismissed', undefined, {
    announcementId,
    action,
  });
}

/**
 * Calculate onboarding metrics
 */
export interface OnboardingMetrics {
  totalUsers: number;
  completionRate: number;
  averageTimeToComplete: number;
  dropOffPoints: { stepId: string; dropOffRate: number }[];
  featureAdoptionRates: { featureId: string; adoptionRate: number }[];
  profileCompletionDistribution: { percentage: number; count: number }[];
}

/**
 * Get onboarding metrics (for admin dashboard)
 */
export async function getOnboardingMetrics(): Promise<OnboardingMetrics> {
  // In production, this would fetch from your analytics database
  // For now, return mock data structure
  return {
    totalUsers: 0,
    completionRate: 0,
    averageTimeToComplete: 0,
    dropOffPoints: [],
    featureAdoptionRates: [],
    profileCompletionDistribution: [],
  };
}

/**
 * Helper: Get user type from context
 */
function getUserType(): 'homeowner' | 'contractor' {
  // In production, get from auth context or user profile
  // For now, return default
  return 'homeowner';
}

/**
 * Helper: Send event to analytics service
 */
function sendToAnalytics(event: OnboardingAnalyticsEvent) {
  // In production, send to your analytics service (e.g., Mixpanel, Amplitude, PostHog)
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track(event.event, {
      ...event.properties,
      stepId: event.stepId,
      userType: event.userType,
      timestamp: event.timestamp,
    });
  }
}

/**
 * Helper: Store event locally for debugging
 */
function storeEventLocally(event: OnboardingAnalyticsEvent) {
  if (typeof window === 'undefined') return;

  try {
    const key = 'mintenance_onboarding_events';
    const stored = localStorage.getItem(key);
    const events = stored ? JSON.parse(stored) : [];

    events.push(event);

    // Keep only last 100 events
    if (events.length > 100) {
      events.shift();
    }

    localStorage.setItem(key, JSON.stringify(events));
  } catch (error) {
    console.error('Failed to store event locally:', error);
  }
}

/**
 * Get locally stored events (for debugging)
 */
export function getLocalEvents(): OnboardingAnalyticsEvent[] {
  if (typeof window === 'undefined') return [];

  try {
    const key = 'mintenance_onboarding_events';
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get local events:', error);
    return [];
  }
}

/**
 * Clear locally stored events
 */
export function clearLocalEvents(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('mintenance_onboarding_events');
  } catch (error) {
    console.error('Failed to clear local events:', error);
  }
}

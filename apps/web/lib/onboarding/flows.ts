/**
 * Onboarding Flow Definitions
 * Defines step-by-step onboarding flows for homeowners and contractors.
 *
 * IMPORTANT: All steps are purely informational (observe-only).
 * The tutorial NEVER force-navigates users away from the dashboard.
 * Users can visit these pages in their own time via the sidebar navigation.
 *
 * targetSelector uses [data-tutorial="..."] attributes on sidebar items.
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for sidebar element to highlight
  action?: 'click' | 'input' | 'navigate' | 'observe';
  skippable: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  nextLabel?: string;
  customContent?: string;
}

export interface OnboardingFlow {
  id: string;
  name: string;
  userType: 'homeowner' | 'contractor';
  steps: OnboardingStep[];
  estimatedMinutes: number;
}

/**
 * Homeowner Onboarding Flow
 */
export const homeownerFlow: OnboardingFlow = {
  id: 'homeowner-onboarding',
  name: 'Homeowner Onboarding',
  userType: 'homeowner',
  estimatedMinutes: 2,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Mintenance!',
      description:
        'Your all-in-one platform for finding trusted contractors, managing home projects, and ensuring quality work. Let\'s give you a quick tour of what\'s available!',
      skippable: true,
      nextLabel: 'Get Started',
    },
    {
      id: 'jobs',
      title: 'Jobs',
      description:
        'This is where you create and manage your maintenance jobs. Post a job describing what you need done, set your budget, and add photos. Contractors in your area will send you bids.',
      targetSelector: '[data-tutorial="jobs"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'messages',
      title: 'Messages',
      description:
        'Chat directly with contractors about your jobs. Ask questions, discuss details, schedule times, or share documents — all in one place.',
      targetSelector: '[data-tutorial="messages"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'documents',
      title: 'Documents',
      description:
        'View all your contracts, bids, and payment records in one place. You can track the status of each document and see what needs your attention.',
      targetSelector: '[data-tutorial="documents"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'properties',
      title: 'Properties',
      description:
        'Add your properties to help contractors understand where the work is needed. You can manage multiple properties and track maintenance history for each one.',
      targetSelector: '[data-tutorial="properties"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'payments',
      title: 'Payments & Escrow',
      description:
        'Your payments are protected with our escrow system. When you accept a bid, funds are held securely until the job is completed and you approve the work.',
      targetSelector: '[data-tutorial="payments"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'profile',
      title: 'Your Profile',
      description:
        'Update your profile whenever you like — add your name, photo, and location. This helps contractors know who they\'re working with, but it\'s completely optional.',
      targetSelector: '[data-tutorial="profile"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'ready',
      title: 'You\'re All Set!',
      description:
        'That\'s the tour! When you\'re ready, head to Jobs to post your first maintenance request. You can explore any of these sections at your own pace.',
      skippable: true,
      nextLabel: 'Finish',
    },
  ],
};

/**
 * Contractor Onboarding Flow
 */
export const contractorFlow: OnboardingFlow = {
  id: 'contractor-onboarding',
  name: 'Contractor Onboarding',
  userType: 'contractor',
  estimatedMinutes: 2,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Mintenance!',
      description:
        'Join thousands of contractors finding quality leads and growing their business. Here\'s a quick tour of the platform!',
      skippable: true,
      nextLabel: 'Get Started',
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      description:
        'This is your home base. See your active jobs, pending bids, earnings, and notifications at a glance. Everything you need is accessible from the sidebar.',
      targetSelector: '[data-tutorial="dashboard"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'jobs',
      title: 'Find Jobs',
      description:
        'Browse available jobs matched to your skills and location. Our system learns your preferences over time to show you the most relevant opportunities.',
      targetSelector: '[data-tutorial="jobs"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'messages',
      title: 'Messages',
      description:
        'Communicate with homeowners about their jobs. Discuss requirements, share documents, create contracts, and keep everything organised in one thread.',
      targetSelector: '[data-tutorial="messages"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'documents',
      title: 'Documents',
      description:
        'Manage your contracts, invoices, and certifications. Upload your qualifications to build trust with potential clients.',
      targetSelector: '[data-tutorial="documents"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'calendar',
      title: 'Calendar',
      description:
        'Keep track of your scheduled jobs, appointments, and availability. Stay organised so you never miss a booking.',
      targetSelector: '[data-tutorial="calendar"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'profile',
      title: 'Your Profile',
      description:
        'Set up your business profile whenever you\'re ready — add your skills, portfolio photos, service areas, and certifications. A complete profile helps you win more jobs.',
      targetSelector: '[data-tutorial="profile"]',
      action: 'observe',
      position: 'right',
      skippable: true,
      nextLabel: 'Next',
    },
    {
      id: 'ready',
      title: 'You\'re All Set!',
      description:
        'That\'s the tour! Start by browsing available jobs, or complete your profile to attract more clients. Everything is at your own pace — no rush.',
      skippable: true,
      nextLabel: 'Finish',
    },
  ],
};

/**
 * Get onboarding flow by user type
 */
export function getFlowByUserType(
  userType: 'homeowner' | 'contractor'
): OnboardingFlow {
  return userType === 'homeowner' ? homeownerFlow : contractorFlow;
}

/**
 * Get step by ID from a flow
 */
export function getStepById(
  flow: OnboardingFlow,
  stepId: string
): OnboardingStep | undefined {
  return flow.steps.find(step => step.id === stepId);
}

/**
 * Get next step after current
 */
export function getNextStepInFlow(
  flow: OnboardingFlow,
  currentStepId: string
): OnboardingStep | null {
  const currentIndex = flow.steps.findIndex(step => step.id === currentStepId);
  if (currentIndex === -1 || currentIndex === flow.steps.length - 1) {
    return null;
  }
  return flow.steps[currentIndex + 1];
}

/**
 * Get previous step
 */
export function getPreviousStepInFlow(
  flow: OnboardingFlow,
  currentStepId: string
): OnboardingStep | null {
  const currentIndex = flow.steps.findIndex(step => step.id === currentStepId);
  if (currentIndex <= 0) {
    return null;
  }
  return flow.steps[currentIndex - 1];
}

/**
 * Get step index (for progress indication)
 */
export function getStepIndex(flow: OnboardingFlow, stepId: string): number {
  return flow.steps.findIndex(step => step.id === stepId);
}

/**
 * Get all step IDs for a flow
 */
export function getAllStepIds(flow: OnboardingFlow): string[] {
  return flow.steps.map(step => step.id);
}

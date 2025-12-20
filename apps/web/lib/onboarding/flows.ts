/**
 * Onboarding Flow Definitions
 * Defines step-by-step onboarding flows for homeowners and contractors
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for element to highlight
  targetRoute?: string; // Route to navigate to for this step
  action?: 'click' | 'input' | 'navigate' | 'observe'; // Required action type
  skippable: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right'; // Tooltip position
  nextLabel?: string; // Custom next button label
  customContent?: string; // For special step content
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
  estimatedMinutes: 5,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Mintenance!',
      description:
        'Your all-in-one platform for finding trusted contractors, managing home projects, and ensuring quality work. Let\'s get you started in just 5 minutes.',
      skippable: true,
      nextLabel: 'Get Started',
    },
    {
      id: 'profile-setup',
      title: 'Complete Your Profile',
      description:
        'Add your name, location, and a profile photo. This helps contractors understand who they\'re working with.',
      targetRoute: '/profile',
      targetSelector: '[data-onboarding="profile-form"]',
      action: 'input',
      position: 'right',
      skippable: false,
      nextLabel: 'Continue',
    },
    {
      id: 'add-property',
      title: 'Add Your First Property',
      description:
        'Tell us about your home. This helps us match you with contractors who specialize in your area and property type.',
      targetRoute: '/properties',
      targetSelector: '[data-onboarding="add-property-button"]',
      action: 'click',
      position: 'bottom',
      skippable: true,
      nextLabel: 'Add Property',
    },
    {
      id: 'post-job',
      title: 'Post Your First Job',
      description:
        'Describe the work you need done. Be specific about the problem and include photos if you have them. Our AI will help match you with the right contractors.',
      targetRoute: '/jobs/create',
      targetSelector: '[data-onboarding="job-form"]',
      action: 'navigate',
      position: 'top',
      skippable: true,
      nextLabel: 'Create Job',
    },
    {
      id: 'contractor-matching',
      title: 'How Contractor Matching Works',
      description:
        'We use AI to analyze your job and match you with qualified contractors in your area. You\'ll receive multiple bids to compare pricing and reviews.',
      targetSelector: '[data-onboarding="matching-info"]',
      action: 'observe',
      position: 'bottom',
      skippable: false,
      nextLabel: 'Got It',
    },
    {
      id: 'review-bids',
      title: 'Reviewing Bids',
      description:
        'When contractors submit bids, you can compare them side-by-side. Check their ratings, reviews, portfolio, and pricing before making a decision.',
      targetRoute: '/jobs',
      targetSelector: '[data-onboarding="bids-section"]',
      action: 'observe',
      position: 'left',
      skippable: false,
      nextLabel: 'Next',
    },
    {
      id: 'messaging',
      title: 'Message Contractors',
      description:
        'Ask questions, clarify details, or schedule video calls directly through our messaging system. Everything stays organized in one place.',
      targetRoute: '/messages',
      targetSelector: '[data-onboarding="messages-list"]',
      action: 'observe',
      position: 'right',
      skippable: false,
      nextLabel: 'Next',
    },
    {
      id: 'payment-escrow',
      title: 'Secure Payments & Escrow',
      description:
        'Your payment is held in escrow until the job is complete. Release funds milestone by milestone, ensuring quality work at every step.',
      targetSelector: '[data-onboarding="payment-info"]',
      action: 'observe',
      position: 'bottom',
      skippable: false,
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
  estimatedMinutes: 7,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Mintenance!',
      description:
        'Join thousands of contractors finding quality leads, growing their business, and building their reputation. Let\'s set up your professional profile.',
      skippable: true,
      nextLabel: 'Get Started',
    },
    {
      id: 'business-profile',
      title: 'Set Up Your Business Profile',
      description:
        'Add your business name, bio, contact info, and what makes you unique. This is your chance to stand out to homeowners.',
      targetRoute: '/contractor/profile',
      targetSelector: '[data-onboarding="business-profile-form"]',
      action: 'input',
      position: 'right',
      skippable: false,
      nextLabel: 'Continue',
    },
    {
      id: 'skills-certifications',
      title: 'Add Your Skills & Certifications',
      description:
        'List your specialties and upload any licenses or certifications. Verified credentials help you win more jobs.',
      targetRoute: '/contractor/profile',
      targetSelector: '[data-onboarding="skills-section"]',
      action: 'input',
      position: 'bottom',
      skippable: false,
      nextLabel: 'Add Skills',
    },
    {
      id: 'portfolio-upload',
      title: 'Showcase Your Best Work',
      description:
        'Upload at least 3 photos of completed projects. High-quality before/after photos significantly increase your bid acceptance rate.',
      targetRoute: '/contractor/profile',
      targetSelector: '[data-onboarding="portfolio-upload"]',
      action: 'click',
      position: 'top',
      skippable: true,
      nextLabel: 'Upload Photos',
    },
    {
      id: 'service-areas',
      title: 'Set Your Service Areas',
      description:
        'Define where you work. You\'ll only see jobs within your service radius, saving you time on irrelevant leads.',
      targetRoute: '/contractor/profile',
      targetSelector: '[data-onboarding="service-areas"]',
      action: 'input',
      position: 'right',
      skippable: false,
      nextLabel: 'Set Areas',
    },
    {
      id: 'discovery-how-it-works',
      title: 'How Job Discovery Works',
      description:
        'Swipe through jobs matched to your skills and location. Swipe right to bid, left to pass. Our AI learns your preferences over time.',
      targetRoute: '/contractor/discover',
      targetSelector: '[data-onboarding="card-stack"]',
      action: 'observe',
      position: 'bottom',
      skippable: false,
      nextLabel: 'Try It',
    },
    {
      id: 'bidding-tutorial',
      title: 'Submitting Your First Bid',
      description:
        'Provide a detailed quote, timeline, and message. Be transparent and professional. Homeowners can see your profile and reviews.',
      targetRoute: '/contractor/discover',
      targetSelector: '[data-onboarding="bid-button"]',
      action: 'observe',
      position: 'left',
      skippable: false,
      nextLabel: 'Next',
    },
    {
      id: 'subscription-options',
      title: 'Forever Free - Upgrade Anytime',
      description:
        'Start free with 5 bids/month - no credit card required. Upgrade to Basic (20 bids), Professional (100 bids), or Enterprise (unlimited) whenever you need more. All plans include professional features to grow your business.',
      targetRoute: '/contractor/subscription',
      targetSelector: '[data-onboarding="subscription-plans"]',
      action: 'observe',
      position: 'top',
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

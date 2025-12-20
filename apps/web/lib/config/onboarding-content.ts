import { IconProps } from '@/components/ui/Icon';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon?: string;
  image?: string;
  details?: string[];
}

export interface OnboardingContent {
  welcome: TutorialStep;
  navigation: TutorialStep;
  coreFeature: TutorialStep;
  messaging: TutorialStep;
  payments: TutorialStep;
  profile: TutorialStep;
}

export const homeownerOnboardingContent: OnboardingContent = {
  welcome: {
    id: 'welcome',
    title: 'Welcome to Mintenance!',
    description: 'Your home maintenance platform where you can easily find trusted contractors, manage projects, and handle payments securely.',
    icon: 'home',
    details: [
      'Post your home maintenance jobs',
      'Receive bids from verified contractors',
      'Communicate securely through messaging',
      'Pay safely with escrow protection',
    ],
  },
  navigation: {
    id: 'navigation',
    title: 'Navigate Your Dashboard',
    description: 'Your dashboard is your command center. Here you can see all your jobs, bids, properties, and financial activity at a glance.',
    icon: 'dashboard',
    details: [
      'View job statistics and KPIs',
      'Track upcoming jobs and estimates',
      'Monitor your spending and invoices',
      'Access all features from the sidebar',
    ],
  },
  coreFeature: {
    id: 'post-jobs',
    title: 'Post Your First Job',
    description: 'Need work done? Post a job with details about your project. Verified contractors near you will see it and can submit bids.',
    icon: 'briefcase',
    details: [
      'Click "Create Job" to get started',
      'Add photos and detailed description',
      'Set your budget and timeline',
      'Review and accept the best bid',
    ],
  },
  messaging: {
    id: 'messaging',
    title: 'Communicate with Contractors',
    description: 'Use our secure messaging system to discuss project details, ask questions, and coordinate with contractors.',
    icon: 'messages',
    details: [
      'Chat directly with contractors',
      'Share photos and documents',
      'View detailed quotes in messages',
      'Keep all communication in one place',
    ],
  },
  payments: {
    id: 'payments',
    title: 'Secure Payments with Escrow',
    description: 'Your payments are protected with escrow. Funds are held securely until the work is completed to your satisfaction.',
    icon: 'creditCard',
    details: [
      'Payments held in escrow until completion',
      'Release funds when work is done',
      'Dispute resolution if needed',
      'Track all transactions in Financials',
    ],
  },
  profile: {
    id: 'profile',
    title: 'Manage Your Profile & Settings',
    description: 'Keep your profile updated, manage your properties, and customize your settings to get the best experience.',
    icon: 'profile',
    details: [
      'Update your personal information',
      'Add and manage your properties',
      'Configure notification preferences',
      'Access help and support resources',
    ],
  },
};

export const contractorOnboardingContent: OnboardingContent = {
  welcome: {
    id: 'welcome',
    title: 'Welcome to Mintenance!',
    description: 'Your professional platform to find jobs, connect with homeowners, and grow your contracting business.',
    icon: 'briefcase',
    details: [
      'Discover jobs matching your skills',
      'Submit detailed quotes with line items',
      'Build relationships with clients',
      'Manage your business all in one place',
    ],
  },
  navigation: {
    id: 'navigation',
    title: 'Navigate Your Dashboard',
    description: 'Your dashboard shows your business metrics, active jobs, revenue, and upcoming tasks. Everything you need to manage your work.',
    icon: 'dashboard',
    details: [
      'View your project summary and progress',
      'Track revenue and financial metrics',
      'See today\'s tasks and quick actions',
      'Access all features from the sidebar',
    ],
  },
  coreFeature: {
    id: 'submit-bids',
    title: 'Submit Bids & Win Jobs',
    description: 'Browse available jobs and submit detailed bids with line items and breakdowns. Homeowners will review and accept the best proposals.',
    icon: 'briefcase',
    details: [
      'Browse jobs in "Jobs & Bids"',
      'View job details and requirements',
      'Submit detailed quotes with line items',
      'Track your bid status and win rate',
    ],
  },
  messaging: {
    id: 'messaging',
    title: 'Communicate with Homeowners',
    description: 'Use secure messaging to discuss project details, answer questions, and build trust with potential clients.',
    icon: 'messages',
    details: [
      'Chat directly with homeowners',
      'Share your portfolio and credentials',
      'Send detailed quotes in messages',
      'Coordinate project timelines',
    ],
  },
  payments: {
    id: 'payments',
    title: 'Get Paid Securely',
    description: 'Receive payments through our secure escrow system. Funds are released when work is completed and approved.',
    icon: 'creditCard',
    details: [
      'Payments held in escrow for protection',
      'Get paid when work is approved',
      'Track all transactions in Finance',
      'Manage invoices and quotes',
    ],
  },
  profile: {
    id: 'profile',
    title: 'Build Your Professional Profile',
    description: 'Create a standout profile to attract homeowners. Showcase your skills, portfolio, and build your reputation.',
    icon: 'profile',
    details: [
      'Complete your business profile',
      'Add your skills and service areas',
      'Upload portfolio photos',
      'Manage your company information',
    ],
  },
};

export function getOnboardingContent(role: 'homeowner' | 'contractor'): OnboardingContent {
  return role === 'contractor' ? contractorOnboardingContent : homeownerOnboardingContent;
}

export const tutorialSteps: (keyof OnboardingContent)[] = [
  'welcome',
  'navigation',
  'coreFeature',
  'messaging',
  'payments',
  'profile',
];


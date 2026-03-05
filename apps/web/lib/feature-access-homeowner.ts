/**
 * Homeowner Feature Definitions
 */
import type { FeatureDefinition } from './feature-access-types';

export const HOMEOWNER_FEATURES: Record<string, FeatureDefinition> = {
  // Job Management
  HOMEOWNER_POST_JOBS: {
    id: 'HOMEOWNER_POST_JOBS',
    name: 'Post Jobs',
    description: 'Create and post job listings to find contractors',
    category: 'Job Management',
    limits: { homeowner: true },
  },
  HOMEOWNER_UNLIMITED_JOBS: {
    id: 'HOMEOWNER_UNLIMITED_JOBS',
    name: 'Unlimited Jobs',
    description: 'Post unlimited number of jobs',
    category: 'Job Management',
    limits: { homeowner: true },
  },
  HOMEOWNER_EDIT_JOBS: {
    id: 'HOMEOWNER_EDIT_JOBS',
    name: 'Edit Jobs',
    description: 'Edit and update job details',
    category: 'Job Management',
    limits: { homeowner: true },
  },
  HOMEOWNER_JOB_TRACKING: {
    id: 'HOMEOWNER_JOB_TRACKING',
    name: 'Job Tracking',
    description: 'Track job progress and milestones',
    category: 'Job Management',
    limits: { homeowner: true },
  },

  // Communication
  HOMEOWNER_MESSAGING: {
    id: 'HOMEOWNER_MESSAGING',
    name: 'Messaging',
    description: 'Chat with contractors about jobs',
    category: 'Communication',
    limits: { homeowner: true },
  },
  HOMEOWNER_VIDEO_CALLS: {
    id: 'HOMEOWNER_VIDEO_CALLS',
    name: 'Video Calls',
    description: 'Schedule and conduct video calls with contractors',
    category: 'Communication',
    limits: { homeowner: true },
  },
  HOMEOWNER_NOTIFICATIONS: {
    id: 'HOMEOWNER_NOTIFICATIONS',
    name: 'Notifications',
    description: 'Receive notifications about bids and messages',
    category: 'Communication',
    limits: { homeowner: true },
  },

  // AI & Search
  HOMEOWNER_AI_ASSESSMENT: {
    id: 'HOMEOWNER_AI_ASSESSMENT',
    name: 'AI Building Assessment',
    description: 'Get AI-powered building condition assessments from photos',
    category: 'AI & Search',
    limits: { homeowner: true },
  },
  HOMEOWNER_AI_SEARCH: {
    id: 'HOMEOWNER_AI_SEARCH',
    name: 'AI Search',
    description: 'Use AI to find the best contractors for your needs',
    category: 'AI & Search',
    limits: { homeowner: true },
  },
  HOMEOWNER_CONTRACTOR_DISCOVERY: {
    id: 'HOMEOWNER_CONTRACTOR_DISCOVERY',
    name: 'Contractor Discovery',
    description: 'Browse and discover contractors',
    category: 'Discovery',
    limits: { homeowner: true },
  },

  // Payments & Financial
  HOMEOWNER_SECURE_PAYMENTS: {
    id: 'HOMEOWNER_SECURE_PAYMENTS',
    name: 'Secure Payments',
    description: 'Make secure payments through the platform',
    category: 'Payments',
    limits: { homeowner: true },
  },
  HOMEOWNER_ESCROW: {
    id: 'HOMEOWNER_ESCROW',
    name: 'Escrow Protection',
    description: 'Hold payments in escrow until work is completed',
    category: 'Payments',
    limits: { homeowner: true },
  },
  HOMEOWNER_PAYMENT_METHODS: {
    id: 'HOMEOWNER_PAYMENT_METHODS',
    name: 'Payment Methods',
    description: 'Manage multiple payment methods',
    category: 'Payments',
    limits: { homeowner: true },
  },

  // Reviews & Ratings
  HOMEOWNER_LEAVE_REVIEWS: {
    id: 'HOMEOWNER_LEAVE_REVIEWS',
    name: 'Leave Reviews',
    description: 'Leave reviews and ratings for contractors',
    category: 'Reviews',
    limits: { homeowner: true },
  },
  HOMEOWNER_VIEW_REVIEWS: {
    id: 'HOMEOWNER_VIEW_REVIEWS',
    name: 'View Reviews',
    description: 'Read reviews from other homeowners',
    category: 'Reviews',
    limits: { homeowner: true },
  },

  // Properties
  HOMEOWNER_PROPERTY_MANAGEMENT: {
    id: 'HOMEOWNER_PROPERTY_MANAGEMENT',
    name: 'Property Management',
    description: 'Manage multiple properties',
    category: 'Properties',
    limits: { homeowner: true },
  },
  HOMEOWNER_PROPERTY_LIMIT: {
    id: 'HOMEOWNER_PROPERTY_LIMIT',
    name: 'Property Limit',
    description: 'Maximum number of properties you can manage',
    category: 'Properties',
    limits: { homeowner_free: 1, homeowner_landlord: 25, homeowner_agency: 'unlimited' },
    upgradeMessage: 'Upgrade to manage more properties.',
    learnMoreUrl: '/pricing',
  },

  // Landlord & Agency Features
  HOMEOWNER_COMPLIANCE_DASHBOARD: {
    id: 'HOMEOWNER_COMPLIANCE_DASHBOARD',
    name: 'Compliance Dashboard',
    description: 'Track gas safety, electrical, EPC and other compliance certificates per property',
    category: 'Compliance',
    limits: { homeowner_free: false, homeowner_landlord: true, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Landlord to track compliance certificates and get expiry reminders.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_TENANT_REPORTING: {
    id: 'HOMEOWNER_TENANT_REPORTING',
    name: 'Tenant Reporting Links',
    description: 'Shareable links for tenants to report maintenance issues without an account',
    category: 'Tenant Management',
    limits: { homeowner_free: false, homeowner_landlord: true, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Landlord to give tenants a simple way to report issues.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_RECURRING_MAINTENANCE: {
    id: 'HOMEOWNER_RECURRING_MAINTENANCE',
    name: 'Recurring Maintenance',
    description: 'Schedule recurring maintenance tasks with automatic job creation',
    category: 'Maintenance',
    limits: { homeowner_free: false, homeowner_landlord: true, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Landlord to schedule recurring maintenance automatically.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_PORTFOLIO_ANALYTICS: {
    id: 'HOMEOWNER_PORTFOLIO_ANALYTICS',
    name: 'Portfolio Analytics',
    description: 'Spend tracking, maintenance history, and analytics per property',
    category: 'Analytics',
    limits: { homeowner_free: false, homeowner_landlord: true, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Landlord for detailed per-property analytics and spend tracking.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_ROOM_PHOTOS: {
    id: 'HOMEOWNER_ROOM_PHOTOS',
    name: 'Room Photo Gallery',
    description: 'Upload and organize property photos by room for documentation and maintenance tracking',
    category: 'Property Management',
    limits: { homeowner_free: false, homeowner_landlord: true, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Landlord to upload and organize photos by room.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_TENANT_CONTACTS: {
    id: 'HOMEOWNER_TENANT_CONTACTS',
    name: 'Tenant & Contact Records',
    description: 'Store tenant details, lease dates, and key contacts per property',
    category: 'Tenant Management',
    limits: { homeowner_free: false, homeowner_landlord: true, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Landlord to manage tenant and contact records.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_TEAM_ACCESS: {
    id: 'HOMEOWNER_TEAM_ACCESS',
    name: 'Team Access',
    description: 'Invite team members with role-based access to manage properties',
    category: 'Team',
    limits: { homeowner_free: false, homeowner_landlord: false, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Agency for team member invites and role-based access.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_BULK_OPERATIONS: {
    id: 'HOMEOWNER_BULK_OPERATIONS',
    name: 'Bulk Operations',
    description: 'Bulk job posting and compliance exports across properties',
    category: 'Team',
    limits: { homeowner_free: false, homeowner_landlord: false, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Agency for bulk operations across your portfolio.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_PRIORITY_MATCHING: {
    id: 'HOMEOWNER_PRIORITY_MATCHING',
    name: 'Priority Contractor Matching',
    description: 'Get matched to top-rated, verified contractors first',
    category: 'AI & Search',
    limits: { homeowner_free: false, homeowner_landlord: true, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Landlord to get priority contractor matching.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_ACTIVITY_AUDIT_LOG: {
    id: 'HOMEOWNER_ACTIVITY_AUDIT_LOG',
    name: 'Activity Audit Log',
    description: 'Track all team activity across your portfolio',
    category: 'Team',
    limits: { homeowner_free: false, homeowner_landlord: false, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Agency for a complete activity audit log.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_DEDICATED_SUPPORT: {
    id: 'HOMEOWNER_DEDICATED_SUPPORT',
    name: 'Dedicated Support',
    description: 'Priority support with dedicated ticket system',
    category: 'Support',
    limits: { homeowner_free: false, homeowner_landlord: false, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Agency for dedicated priority support.',
    learnMoreUrl: '/pricing',
  },
  HOMEOWNER_YOY_COMPARISON: {
    id: 'HOMEOWNER_YOY_COMPARISON',
    name: 'Year-over-Year Comparison',
    description: 'Compare maintenance spend and activity across years',
    category: 'Analytics',
    limits: { homeowner_free: false, homeowner_landlord: false, homeowner_agency: true },
    upgradeMessage: 'Upgrade to Agency for year-over-year portfolio comparisons.',
    learnMoreUrl: '/pricing',
  },
};

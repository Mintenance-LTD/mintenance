import type { SubscriptionPlan } from './types';

/**
 * Static role-specific plan catalogues. Mirror the web /pricing page.
 * No `subscription_plans` DB table exists — plans live in code.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44f).
 */

export const HOMEOWNER_PLANS: SubscriptionPlan[] = [
  {
    id: 'homeowner_free',
    name: 'Free',
    price: 0,
    billingCycle: 'monthly',
    features: [
      'Post unlimited jobs',
      'Manage 1 property',
      'AI-powered matching',
      'Payment protection',
      'Basic messaging',
    ],
    recommended: false,
  },
  {
    id: 'homeowner_landlord',
    name: 'Landlord',
    price: 24.99,
    billingCycle: 'monthly',
    features: [
      'Everything in Free',
      'Up to 25 properties',
      'Compliance dashboard',
      'Recurring maintenance',
      'Per-property analytics',
    ],
    recommended: true,
  },
  {
    id: 'homeowner_agency',
    name: 'Agency',
    price: 49.99,
    billingCycle: 'monthly',
    features: [
      'Everything in Landlord',
      'Unlimited properties',
      'Team member invites',
      'Bulk job posting',
      'Dedicated support',
    ],
    recommended: false,
  },
];

export const CONTRACTOR_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    billingCycle: 'monthly',
    features: ['10 bids/month', '1 active job', 'Basic profile'],
    recommended: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29,
    billingCycle: 'monthly',
    features: [
      'Unlimited bids',
      'Unlimited jobs',
      'Priority listing',
      'Analytics',
      'Lead recommendations',
    ],
    recommended: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 99,
    billingCycle: 'monthly',
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Team accounts (up to 10)',
      'API access',
      'Custom branding',
      'White-label invoicing',
    ],
    recommended: false,
  },
];

export function plansForRole(role: string | undefined): SubscriptionPlan[] {
  return role === 'contractor' ? CONTRACTOR_PLANS : HOMEOWNER_PLANS;
}

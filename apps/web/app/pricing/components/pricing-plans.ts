import { Star, Building2, Users, Zap, Crown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PricingPlan {
  id: string;
  name: string;
  icon: LucideIcon;
  price: number;
  billingCycle: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  popular?: boolean;
  cta: string;
  color: string;
}

export function getHomeownerPlans(isAnnual: boolean): PricingPlan[] {
  return [
    {
      id: 'free',
      name: 'Free',
      icon: Star,
      price: 0,
      billingCycle: 'forever',
      description: 'Everything you need for your home',
      features: [
        'Post unlimited jobs',
        'Manage 1 property',
        'AI-powered pro matching',
        'View contractor profiles',
        'Standard messaging',
        'Payment protection',
        'Review system',
        'AI building assessment',
      ],
      notIncluded: [
        'Compliance dashboard & expiry reminders',
        'Tenant reporting links',
        'Recurring maintenance scheduling',
        'Multiple properties',
      ],
      cta: 'Get Started Free',
      color: 'gray',
    },
    {
      id: 'landlord',
      name: 'Landlord',
      icon: Building2,
      price: isAnnual ? 249 : 24.99,
      billingCycle: isAnnual ? 'year' : 'month',
      description: 'Complete management for landlords with up to 25 properties',
      features: [
        'Everything in Free',
        'Up to 25 properties',
        'Compliance dashboard (gas, electrical, EPC)',
        'Expiry reminders (90/30/7 days)',
        'One-click renewal job creation',
        'Tenant reporting links',
        'Tenant & contact records',
        'Recurring maintenance scheduling',
        'Per-property spend analytics',
        'Priority contractor matching',
      ],
      popular: true,
      cta: 'Start Landlord Plan',
      color: 'teal',
    },
    {
      id: 'agency',
      name: 'Agency',
      icon: Users,
      price: isAnnual ? 499 : 49.99,
      billingCycle: isAnnual ? 'year' : 'month',
      description: 'Multi-user portfolio management for letting agents',
      features: [
        'Everything in Landlord',
        'Unlimited properties',
        'Team member invites (up to 10)',
        'Role-based access (admin/manager/viewer)',
        'Activity audit log',
        'Bulk job posting',
        'Bulk compliance export (PDF)',
        'Year-over-year comparison',
        'Dedicated support',
      ],
      cta: 'Start Agency Plan',
      color: 'purple',
    },
  ];
}

/**
 * 2026-05-22 — Sprint 1 of feat/tiered-pricing.
 *
 * Aligned with code reality:
 * - Fees changed 15/10/7 → 12/8/5 (single source of truth in
 *   feature-access-config.ts PLATFORM_FEE_RATE_BY_TIER). Sprint 2 wires
 *   FeeCalculationService to read this so the % advertised here is the %
 *   actually charged.
 * - Basic gains a 3-active-jobs cap. Enforced at bid-accept time in Sprint 2.
 * - Pro bid limit corrected: was 50 in code but advertised as unlimited;
 *   config bumped to 'unlimited' in feature-access-contractor.ts.
 * - Dropped from landing (no code consumer, no roadmap to build):
 *   dedicated account manager, custom branding, white-label invoicing,
 *   advanced automation tools, social feed.
 * - "Lead recommendations" is the consolidated name for the marketing/lead
 *   features we'll actually build (daily push+email digest, Sprint 3).
 */
export function getContractorPlans(isAnnual: boolean): PricingPlan[] {
  return [
    {
      id: 'basic',
      name: 'Basic',
      icon: Star,
      price: 0,
      billingCycle: 'month',
      description: 'Get started and build your reputation',
      features: [
        'Create business profile',
        'Bid on 10 jobs per month',
        'Work on up to 3 jobs at a time',
        '12% platform fee',
        'Basic messaging',
        'Review collection',
        'Payment processing',
      ],
      notIncluded: [
        'Unlimited bids & active jobs',
        'Featured in search results',
        'Advanced analytics',
      ],
      cta: 'Start Free',
      color: 'gray',
    },
    {
      id: 'professional',
      name: 'Professional',
      icon: Zap,
      price: isAnnual ? 290 : 29,
      billingCycle: isAnnual ? 'year' : 'month',
      description: 'For growing contractor businesses',
      features: [
        'Everything in Basic',
        'Unlimited job bids',
        'Unlimited active jobs',
        '8% platform fee (33% savings)',
        'Featured in search results',
        'Advanced analytics dashboard',
        'Priority support (24h response)',
        'Lead recommendations (daily digest)',
      ],
      popular: true,
      cta: 'Go Professional',
      color: 'teal',
    },
    {
      id: 'business',
      name: 'Business',
      icon: Crown,
      price: isAnnual ? 990 : 99,
      billingCycle: isAnnual ? 'year' : 'month',
      description: 'For established businesses and teams',
      features: [
        'Everything in Professional',
        '5% platform fee (58% savings vs Basic)',
        'Top placement in search',
        'Team member accounts (up to 10)',
        'API access',
        'Phone support',
        'Custom reports & data exports',
      ],
      cta: 'Contact Sales',
      color: 'purple',
    },
  ];
}

export const PRICING_FAQS = [
  {
    question: 'Can I switch plans at any time?',
    answer:
      "Yes! You can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately, and we'll prorate any charges.",
  },
  {
    question: 'Is there a free trial for premium plans?',
    answer:
      'Yes, we offer a 14-day free trial for all premium plans. No credit card required to start.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards, debit cards, and bank transfers. Payments are processed securely through Stripe.',
  },
  {
    question: 'Are there any hidden fees?',
    answer:
      'No hidden fees. The prices shown are all you pay. Contractors pay a percentage platform fee only when they win a job.',
  },
  {
    question: "What if I need more than what's included?",
    answer:
      'Contact our sales team for custom enterprise plans tailored to your specific needs.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      "Yes, we offer a 30-day money-back guarantee on all annual plans if you're not satisfied.",
  },
];

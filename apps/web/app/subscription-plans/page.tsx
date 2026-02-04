import Link from 'next/link';
import { SubscriptionPlansClient } from './SubscriptionPlansClient';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Subscription Plans for Contractors | Mintenance',
  description: 'Choose the perfect subscription plan for your contracting business. Professional and Business plans with reduced platform fees, priority placement, and advanced features.',
  keywords: 'contractor subscription, pricing plans, professional plan, business plan, contractor fees, platform pricing',
  openGraph: {
    title: 'Subscription Plans for Contractors | Mintenance',
    description: 'Choose the perfect subscription plan for your contracting business.',
    type: 'website',
    images: [
      {
        url: '/og-subscription-plans.jpg',
        width: 1200,
        height: 630,
        alt: 'Mintenance Subscription Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Subscription Plans | Mintenance',
    description: 'Professional and Business plans with reduced fees and advanced features.',
  },
};

const CONTRACTOR_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    priceAnnual: 0,
    description: 'Get started and build your reputation',
    platformFee: '15%',
    features: [
      '10 bids per month',
      '15% platform fee',
      'Basic profile',
      'Standard support',
      'Review collection',
      'Messaging with homeowners',
      'Payment processing & escrow',
      'Quote builder',
      'Invoice management',
      'Resources library',
    ],
    cta: 'Start Free',
    color: 'gray' as const,
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29,
    priceAnnual: 290,
    description: 'For growing contractor businesses',
    platformFee: '10%',
    savings: '33% savings',
    features: [
      'Unlimited bids',
      '10% platform fee (33% savings)',
      'Featured listing',
      'Priority support',
      'Advanced analytics',
      'Lead recommendations',
      'Social feed & community',
      'Custom quote templates',
      'Up to 50 portfolio photos',
      'Custom branding on profile',
    ],
    cta: 'Go Professional',
    color: 'teal' as const,
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 99,
    priceAnnual: 990,
    description: 'For established businesses and teams',
    platformFee: '7%',
    savings: '53% savings',
    features: [
      'Everything in Professional',
      '7% platform fee (53% savings)',
      'Top placement',
      'Team accounts (10 members)',
      'Dedicated account manager',
      'API access',
      'Custom branding',
      'White-label invoicing',
      'Advanced automation tools',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    color: 'purple' as const,
    popular: false,
  },
];

export default function SubscriptionPlansPage() {
  return (
    <ErrorBoundary componentName="SubscriptionPlansPage">
      <div>
        <LandingNavigation />
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Contractor Subscription Plans
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Choose the plan that fits your business. No hidden fees. Upgrade or downgrade anytime.
              </p>
            </div>

            <SubscriptionPlansClient plans={CONTRACTOR_PLANS} />

            <div className="mt-16 text-center">
              <p className="text-gray-600 mb-4">
                Already have an account?{' '}
                <Link
                  href="/login?redirect=/contractor/subscription"
                  className="text-[#3B82F6] font-medium hover:underline"
                >
                  Log in to manage your subscription
                </Link>
              </p>
              <Link
                href="/register?type=contractor"
                className="inline-flex items-center justify-center rounded-lg bg-[#1F2937] text-white px-6 py-3 font-semibold hover:bg-[#374151] transition-colors"
              >
                Create contractor account
              </Link>
            </div>
          </div>
        </div>
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}

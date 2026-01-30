import Link from 'next/link';
import { SubscriptionPlansClient } from './SubscriptionPlansClient';

/**
 * Contractor plans – features listed match what is integrated in the app and backend.
 * See lib/feature-access-config.ts and docs/PROFESSIONAL_SUBSCRIPTION_BACKEND_REVIEW.md.
 */
const CONTRACTOR_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    priceAnnual: 0,
    description: 'Get started and build your reputation',
    features: [
      '10 bids per month',
      'Create business profile',
      'Bid on jobs',
      'Messaging with homeowners',
      'Collect and display reviews',
      'Payment processing & escrow',
      'Quote builder',
      'Invoice management',
      'Verified badge (when verified)',
      'Email support',
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
    features: [
      '50 bids per month',
      'Everything in Basic',
      'Advanced analytics dashboard',
      'Priority support',
      'Social feed & community',
      'More portfolio photos',
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
    features: [
      'Unlimited bids per month',
      'Everything in Professional',
      'API access for integrations',
      'Team accounts & dedicated support — contact us',
    ],
    cta: 'Contact Sales',
    color: 'purple' as const,
    popular: false,
  },
];

export default function SubscriptionPlansPage() {
  return (
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
  );
}

/**
 * Feature Access System - Integration Examples
 *
 * This file demonstrates how to integrate the feature access system
 * into your existing pages and components.
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  FeatureGate,
  FeatureButton,
  FeatureBadge,
  withFeatureAccess,
} from '@/components/ui/FeatureGate';
import { useFeatureAccess, useFeature } from '@/hooks/useFeatureAccess';
import { Paywall, PaywallBanner } from '@/components/ui/Paywall';

// =====================================================
// Example 1: Protected Page Component
// =====================================================
export function ProtectedSocialFeedPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Contractor Community</h1>

      <FeatureGate featureId="CONTRACTOR_SOCIAL_FEED">
        {/* This content only shows to Professional+ users */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <FeedContent />
          </div>
          <div>
            <TrendingTopics />
            <RecommendedConnections />
          </div>
        </div>
      </FeatureGate>
    </div>
  );
}

// =====================================================
// Example 2: Protected Section with Banner Mode
// =====================================================
export function DashboardWithUpgradeBanner() {
  return (
    <div className="space-y-6">
      {/* Basic analytics - available to all */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <BasicMetricsCards />
      </div>

      {/* Advanced analytics - shows banner if locked */}
      <FeatureGate
        featureId="CONTRACTOR_ADVANCED_ANALYTICS"
        mode="banner"
      >
        <div>
          <h2 className="text-2xl font-semibold mb-4">Advanced Analytics</h2>
          <AdvancedChartsAndGraphs />
        </div>
      </FeatureGate>
    </div>
  );
}

// =====================================================
// Example 3: Bid Submission with Usage Tracking
// =====================================================
export function BidSubmissionForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [bidAmount, setBidAmount] = React.useState('');
  const [description, setDescription] = React.useState('');

  // Get feature access info
  const { getRemainingUsage } = useFeatureAccess();
  const remaining = getRemainingUsage('CONTRACTOR_BID_LIMIT');

  const handleSubmit = async () => {
    // Submit bid logic here
    console.log('Submitting bid...', { jobId, bidAmount, description });

    // Show success and navigate
    router.push('/contractor/bids?success=true');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Submit Your Bid</h2>
        {remaining !== 'unlimited' && (
          <div className="text-sm text-gray-600">
            Bids remaining this month:{' '}
            <span className="font-semibold text-primary-600">
              {remaining}
            </span>
          </div>
        )}
      </div>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bid Amount (£)
          </label>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Enter your bid amount"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Describe your approach to this job..."
          />
        </div>

        {/* Protected submit button with automatic usage tracking */}
        <FeatureButton
          featureId="CONTRACTOR_BID_LIMIT"
          trackUsage={true}
          onClick={handleSubmit}
          disabled={!bidAmount || !description}
          className="w-full py-3 bg-primary-600 text-white rounded-lg
                   font-semibold hover:bg-primary-700 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Bid
        </FeatureButton>
      </form>
    </div>
  );
}

// =====================================================
// Example 4: Conditional Rendering Based on Access
// =====================================================
export function AnalyticsDashboard() {
  const { hasAccess, loading } = useFeature('CONTRACTOR_ADVANCED_ANALYTICS');

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Always show basic metrics */}
        <MetricCard title="Total Jobs" value="24" />
        <MetricCard title="Active Bids" value="8" />
        <MetricCard title="Win Rate" value="65%" />
        <MetricCard title="Avg Response" value="2.4h" />
      </div>

      {/* Conditional rendering based on feature access */}
      {hasAccess ? (
        <AdvancedAnalytics />
      ) : (
        <BasicAnalytics />
      )}
    </div>
  );
}

// =====================================================
// Example 5: Portfolio Gallery with Photo Limit
// =====================================================
export function PortfolioGallery() {
  const { hasAccess: checkAccess, getRemainingUsage } = useFeatureAccess();
  const [showUploadModal, setShowUploadModal] = React.useState(false);

  const result = checkAccess('CONTRACTOR_PORTFOLIO_PHOTOS');
  const remaining = getRemainingUsage('CONTRACTOR_PORTFOLIO_PHOTOS');

  const handleUploadClick = () => {
    if (!result.hasAccess || remaining === 0) {
      // Will show paywall via FeatureButton
      return;
    }
    setShowUploadModal(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Portfolio</h2>
          <p className="text-gray-600 text-sm mt-1">
            Showcase your best work
            {remaining !== 'unlimited' && (
              <span className="ml-2 text-primary-600 font-medium">
                ({remaining} slots remaining)
              </span>
            )}
          </p>
        </div>

        <FeatureButton
          featureId="CONTRACTOR_PORTFOLIO_PHOTOS"
          trackUsage={true}
          onClick={handleUploadClick}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg
                   font-semibold hover:bg-primary-700"
        >
          Upload Photo
        </FeatureButton>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <PortfolioImages />
      </div>
    </div>
  );
}

// =====================================================
// Example 6: Feature List with Badges
// =====================================================
export function SubscriptionComparisonPage() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-12">
        Choose Your Plan
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Basic Tier */}
        <PlanCard
          name="Basic"
          price={29}
          features={[
            { id: 'CONTRACTOR_BID_LIMIT', name: '20 bids per month' },
            { id: 'CONTRACTOR_DISCOVERY_CARD', name: 'Discovery Card' },
            { id: 'CONTRACTOR_VERIFIED_BADGE', name: 'Verified Badge' },
            { id: 'CONTRACTOR_INVOICE_MANAGEMENT', name: 'Invoice Management' },
          ]}
        />

        {/* Professional Tier */}
        <PlanCard
          name="Professional"
          price={79}
          popular
          features={[
            { id: 'CONTRACTOR_BID_LIMIT', name: '100 bids per month' },
            { id: 'CONTRACTOR_SOCIAL_FEED', name: 'Social Feed Access' },
            { id: 'CONTRACTOR_ADVANCED_ANALYTICS', name: 'Advanced Analytics' },
            { id: 'CONTRACTOR_CRM', name: 'CRM Tools' },
            { id: 'CONTRACTOR_CUSTOM_BRANDING', name: 'Custom Branding' },
          ]}
        />

        {/* Enterprise Tier */}
        <PlanCard
          name="Enterprise"
          price={199}
          features={[
            { id: 'CONTRACTOR_BID_LIMIT', name: 'Unlimited bids' },
            { id: 'CONTRACTOR_TEAM_MANAGEMENT', name: 'Team Management' },
            { id: 'CONTRACTOR_API_ACCESS', name: 'API Access' },
            { id: 'CONTRACTOR_DEDICATED_ACCOUNT_MANAGER', name: 'Account Manager' },
            { id: 'CONTRACTOR_PHONE_SUPPORT', name: 'Phone Support' },
          ]}
        />
      </div>
    </div>
  );
}

// =====================================================
// Example 7: Settings Page with Feature Toggles
// =====================================================
export function SettingsPage() {
  const { hasAccess: checkAccess } = useFeatureAccess();

  const sections = [
    {
      title: 'Profile Settings',
      features: [
        { id: 'basic_profile', name: 'Basic Profile', available: true },
        { id: 'CONTRACTOR_CUSTOM_BRANDING', name: 'Custom Branding' },
        { id: 'CONTRACTOR_VERIFIED_BADGE', name: 'Verified Badge' },
      ],
    },
    {
      title: 'Business Tools',
      features: [
        { id: 'CONTRACTOR_QUOTE_BUILDER', name: 'Quote Builder' },
        { id: 'CONTRACTOR_INVOICE_MANAGEMENT', name: 'Invoices' },
        { id: 'CONTRACTOR_CRM', name: 'CRM' },
        { id: 'CONTRACTOR_TEAM_MANAGEMENT', name: 'Team Management' },
      ],
    },
    {
      title: 'Communication',
      features: [
        { id: 'CONTRACTOR_MESSAGING', name: 'Messaging' },
        { id: 'CONTRACTOR_VIDEO_CALLS', name: 'Video Calls' },
        { id: 'CONTRACTOR_VIDEO_CALL_RECORDING', name: 'Call Recording' },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
            <div className="space-y-3">
              {section.features.map((feature) => {
                const hasAccess =
                  feature.available ||
                  checkAccess(feature.id as string).hasAccess;

                return (
                  <div
                    key={feature.id}
                    className="flex items-center justify-between py-3 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">
                        {feature.name}
                      </span>
                      {!feature.available && (
                        <FeatureBadge featureId={feature.id as string} />
                      )}
                    </div>

                    <button
                      disabled={!hasAccess}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium
                        transition-colors
                        ${
                          hasAccess
                            ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      Configure
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// Example 8: Higher-Order Component Pattern
// =====================================================

// Create protected versions of components
const ProtectedCRM = withFeatureAccess(
  CRMDashboard,
  'CONTRACTOR_CRM',
  { mode: 'banner' }
);

const ProtectedAPIAccess = withFeatureAccess(
  APIDocumentation,
  'CONTRACTOR_API_ACCESS',
  { mode: 'hide' }
);

export function BusinessToolsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Business Tools</h1>

      <div className="space-y-8">
        {/* Quote Builder - Available to all */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Quote Builder</h2>
          <QuoteBuilderTool />
        </section>

        {/* CRM - Shows banner if locked */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Customer Management</h2>
          <ProtectedCRM />
        </section>

        {/* API - Hidden if locked */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Developer API</h2>
          <ProtectedAPIAccess />
        </section>
      </div>
    </div>
  );
}

// =====================================================
// Helper Components (Stubs for examples)
// =====================================================

function FeedContent() {
  return <div className="bg-gray-50 p-6 rounded-lg">Social feed content...</div>;
}

function TrendingTopics() {
  return <div className="bg-white p-4 rounded-lg shadow-sm">Trending topics...</div>;
}

function RecommendedConnections() {
  return <div className="bg-white p-4 rounded-lg shadow-sm mt-4">Connections...</div>;
}

function BasicMetricsCards() {
  return <div className="grid grid-cols-4 gap-4">Metrics...</div>;
}

function AdvancedChartsAndGraphs() {
  return <div className="space-y-6">Advanced charts...</div>;
}

function BasicAnalytics() {
  return <div className="bg-gray-50 p-8 rounded-lg">Basic analytics view...</div>;
}

function AdvancedAnalytics() {
  return <div className="space-y-6">Advanced analytics with detailed insights...</div>;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin h-12 w-12 border-4 border-primary-600 rounded-full border-t-transparent" />
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function PortfolioImages() {
  return <div className="bg-gray-200 h-48 rounded-lg">Portfolio images...</div>;
}

function PlanCard({
  name,
  price,
  features,
  popular,
}: {
  name: string;
  price: number;
  features: Array<{ id: string; name: string }>;
  popular?: boolean;
}) {
  return (
    <div
      className={`
      p-6 rounded-xl border-2 relative
      ${popular ? 'border-primary-600 shadow-xl' : 'border-gray-200'}
    `}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
            POPULAR
          </span>
        </div>
      )}

      <h3 className="text-2xl font-bold mb-2">{name}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold">£{price}</span>
        <span className="text-gray-600">/month</span>
      </div>

      <ul className="space-y-3">
        {features.map((feature) => (
          <li key={feature.id} className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-gray-700">{feature.name}</span>
          </li>
        ))}
      </ul>

      <button
        className={`
        w-full mt-6 py-3 rounded-lg font-semibold
        ${
          popular
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }
      `}
      >
        Choose {name}
      </button>
    </div>
  );
}

function QuoteBuilderTool() {
  return <div className="bg-white p-6 rounded-lg shadow-sm">Quote builder interface...</div>;
}

function CRMDashboard() {
  return <div className="bg-white p-6 rounded-lg shadow-sm">CRM dashboard...</div>;
}

function APIDocumentation() {
  return <div className="bg-white p-6 rounded-lg shadow-sm">API documentation...</div>;
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { TIER_PRICING, type SubscriptionTier, type FeatureDefinition } from '@/lib/feature-access-config';
import { logger } from '@mintenance/shared';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  feature: FeatureDefinition;
  currentTier: SubscriptionTier;
  upgradeTiers: SubscriptionTier[];
  onUpgrade?: (tier: SubscriptionTier) => void;
}

export function Paywall({
  isOpen,
  onClose,
  feature,
  currentTier,
  upgradeTiers,
  onUpgrade,
}: PaywallProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    upgradeTiers[0] || 'basic'
  );
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setIsUpgrading(true);
    try {
      if (onUpgrade) {
        await onUpgrade(tier);
      } else {
        // Default: navigate to subscription page
        router.push(`/contractor/subscription?plan=${tier}&feature=${feature.id}`);
      }
    } catch (err) {
      logger.error('[Paywall] Upgrade failed', err);
    } finally {
      setIsUpgrading(false);
    }
  };

  const tierInfo = TIER_PRICING[selectedTier];
  const featureLimit = feature.limits[selectedTier];

  // Format the limit display
  const formatLimit = (limit: number | boolean | 'unlimited' | undefined): string => {
    if (limit === 'unlimited') return 'Unlimited';
    if (typeof limit === 'number') return limit.toString();
    if (limit === true) return 'Full Access';
    return 'Not Available';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl pointer-events-auto
                     transform transition-all duration-300 ease-out
                     max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100
                     transition-colors duration-200 z-10"
            aria-label="Close"
          >
            <Icon name="x" size={24} color="#6B7280" />
          </button>

          {/* Header Section */}
          <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-white">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Icon name="lock" size={28} color="white" />
                </div>
                <h2 className="text-heading-sm font-[640] tracking-tight">
                  Unlock {feature.name}
                </h2>
              </div>
              <p className="text-lg text-white/90 leading-relaxed">
                {feature.id === 'CONTRACTOR_BID_LIMIT' && currentTier === 'free'
                  ? "You've used all 5 bids this month. Upgrade to Basic (20 bids/month) or wait until the 1st of next month for your bids to reset."
                  : feature.upgradeMessage ||
                    `Upgrade your plan to access ${feature.name} and grow your business faster.`}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Feature Benefits */}
            <div className="mb-8">
              <h3 className="text-subheading-sm font-[600] text-gray-900 mb-4">
                What you'll get with {feature.name}:
              </h3>
              <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="shrink-0 mt-0.5">
                    <Icon name="check-circle" size={24} color="#10B981" />
                  </div>
                  <div>
                    <p className="text-base font-[500] text-gray-900 mb-1">
                      {feature.description}
                    </p>
                    {feature.category && (
                      <p className="text-sm text-gray-600">
                        Category: {feature.category}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Selection */}
            <div className="mb-8">
              <h3 className="text-subheading-sm font-[600] text-gray-900 mb-4">
                Choose your plan:
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {upgradeTiers.map((tier) => {
                  const pricing = TIER_PRICING[tier];
                  const limit = feature.limits[tier];
                  const isSelected = selectedTier === tier;
                  const isPopular = pricing.popular;

                  return (
                    <button
                      key={tier}
                      onClick={() => setSelectedTier(tier)}
                      className={`
                        relative p-6 rounded-xl border-2 transition-all duration-200
                        text-left
                        ${isSelected
                          ? 'border-primary-600 bg-primary-50 shadow-lg scale-[1.02]'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }
                      `}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-4">
                          <span className="inline-flex px-3 py-1 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-xs font-semibold rounded-full shadow-md">
                            POPULAR
                          </span>
                        </div>
                      )}

                      <div className="mb-3">
                        <h4 className="text-lg font-[600] text-gray-900 mb-1">
                          {pricing.name}
                        </h4>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-2xl font-[640] text-gray-900">
                            £{pricing.price}
                          </span>
                          <span className="text-sm text-gray-600">
                            /{pricing.period}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {pricing.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon
                            name="check"
                            size={16}
                            color={isSelected ? '#0EA5E9' : '#10B981'}
                          />
                          <span className="text-sm font-[500] text-gray-700">
                            {feature.name}: <span className="font-[600]">{formatLimit(limit)}</span>
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div className="p-1 bg-primary-600 rounded-full">
                            <Icon name="check" size={16} color="white" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Plan Info */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="info" size={16} color="#6B7280" />
                <span>
                  Current Plan: <span className="font-[600] text-gray-900">
                    {TIER_PRICING[currentTier].name}
                  </span>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleUpgrade(selectedTier)}
                disabled={isUpgrading}
                className="flex-1 py-3.5 px-6 bg-primary-600 text-white rounded-xl
                         font-semibold text-base
                         hover:bg-primary-700 active:scale-[0.98]
                         transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg hover:shadow-xl"
              >
                {isUpgrading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Upgrading...
                  </span>
                ) : (
                  `Upgrade to ${tierInfo.name} - £${tierInfo.price}/${tierInfo.period}`
                )}
              </button>

              <button
                onClick={onClose}
                disabled={isUpgrading}
                className="sm:w-auto px-6 py-3.5 border-2 border-gray-300 text-gray-700
                         font-semibold text-base rounded-xl
                         hover:bg-gray-50 hover:border-gray-400
                         active:scale-[0.98]
                         transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Maybe Later
              </button>
            </div>

            {/* Learn More Link */}
            {feature.learnMoreUrl && (
              <div className="mt-6 text-center">
                <a
                  href={feature.learnMoreUrl}
                  className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700
                           font-[500] text-sm transition-colors duration-200"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(feature.learnMoreUrl!);
                  }}
                >
                  <span>Learn more about our pricing plans</span>
                  <Icon name="arrow-right" size={16} color="currentColor" />
                </a>
              </div>
            )}

            {/* Trust Indicators */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Icon name="shield-check" size={20} color="#10B981" />
                  </div>
                  <p className="text-sm font-[500] text-gray-700">
                    Cancel Anytime
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Icon name="credit-card" size={20} color="#0EA5E9" />
                  </div>
                  <p className="text-sm font-[500] text-gray-700">
                    Secure Payment
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Icon name="zap" size={20} color="#8B5CF6" />
                  </div>
                  <p className="text-sm font-[500] text-gray-700">
                    Instant Access
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Compact Paywall Banner
 * Can be used inline on pages instead of modal
 */
interface PaywallBannerProps {
  feature: FeatureDefinition;
  currentTier: SubscriptionTier;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export function PaywallBanner({
  feature,
  currentTier,
  onUpgrade,
  onDismiss,
}: PaywallBannerProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push(`/contractor/subscription?feature=${feature.id}`);
    }
  };

  return (
    <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
      </div>

      <div className="relative">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-0 right-0 p-1 rounded-full hover:bg-white/20
                     transition-colors duration-200"
            aria-label="Dismiss"
          >
            <Icon name="x" size={20} color="white" />
          </button>
        )}

        <div className="flex items-start gap-4">
          <div className="shrink-0 p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Icon name="lock" size={24} color="white" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-[600] mb-1">
              Unlock {feature.name}
            </h3>
            <p className="text-white/90 text-sm mb-4">
              {feature.upgradeMessage || feature.description}
            </p>

            <button
              onClick={handleUpgrade}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-700
                       rounded-lg font-[600] text-sm
                       hover:bg-white/95 active:scale-[0.98]
                       transition-all duration-200 shadow-lg"
            >
              <span>Upgrade Now</span>
              <Icon name="arrow-right" size={16} color="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

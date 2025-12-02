'use client';

import React, { useState, useCallback } from 'react';
import { useFeatureAccess, type FeatureAccessResult } from '@/hooks/useFeatureAccess';
import { Paywall, PaywallBanner } from './Paywall';
import { type SubscriptionTier } from '@/lib/feature-access-config';

interface FeatureGateProps {
  /**
   * The feature ID to check access for
   */
  featureId: string;

  /**
   * Children to render if user has access
   */
  children: React.ReactNode;

  /**
   * Optional fallback content to show if no access
   * If not provided, shows paywall modal
   */
  fallback?: React.ReactNode;

  /**
   * Display mode: 'modal' (default) or 'banner'
   * - modal: Shows a modal overlay when feature is locked
   * - banner: Shows an inline upgrade banner
   * - hide: Hides the children completely without any UI
   */
  mode?: 'modal' | 'banner' | 'hide';

  /**
   * Automatically track usage when feature is accessed
   * Only applicable for metered features
   */
  trackUsage?: boolean;

  /**
   * Callback when user attempts to access locked feature
   */
  onAccessDenied?: (result: FeatureAccessResult) => void;

  /**
   * Callback when user clicks upgrade
   */
  onUpgrade?: (tier: SubscriptionTier) => void;

  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;

  /**
   * Custom error component
   */
  errorComponent?: React.ReactNode;
}

/**
 * FeatureGate Component
 *
 * Wraps content that requires feature access and automatically handles:
 * - Access checking
 * - Usage tracking
 * - Paywall display
 * - Loading states
 *
 * @example
 * ```tsx
 * <FeatureGate featureId="CONTRACTOR_SOCIAL_FEED">
 *   <ContractorSocialFeed />
 * </FeatureGate>
 * ```
 *
 * @example With banner mode
 * ```tsx
 * <FeatureGate featureId="CONTRACTOR_ADVANCED_ANALYTICS" mode="banner">
 *   <AdvancedAnalyticsChart />
 * </FeatureGate>
 * ```
 *
 * @example With usage tracking
 * ```tsx
 * <FeatureGate featureId="CONTRACTOR_BID_LIMIT" trackUsage>
 *   <BidSubmissionForm />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  featureId,
  children,
  fallback,
  mode = 'modal',
  trackUsage = false,
  onAccessDenied,
  onUpgrade,
  loadingComponent,
  errorComponent,
}: FeatureGateProps) {
  const {
    hasAccess: checkAccess,
    trackUsage: trackUsageBase,
    loading,
    tier,
  } = useFeatureAccess();

  const [showPaywall, setShowPaywall] = useState(false);
  const [hasTrackedUsage, setHasTrackedUsage] = useState(false);

  const accessResult = checkAccess(featureId);

  // Track usage on mount if enabled and has access
  React.useEffect(() => {
    if (trackUsage && accessResult.hasAccess && !hasTrackedUsage) {
      trackUsageBase(featureId).then(() => {
        setHasTrackedUsage(true);
      });
    }
  }, [trackUsage, accessResult.hasAccess, hasTrackedUsage, featureId, trackUsageBase]);

  // Handle access denied
  const handleAccessDenied = useCallback(() => {
    if (onAccessDenied) {
      onAccessDenied(accessResult);
    }

    if (mode === 'modal') {
      setShowPaywall(true);
    }
  }, [accessResult, onAccessDenied, mode]);

  // Show loading state
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-gray-200 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-primary-600 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-[500] text-gray-600">
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  // User has access - render children
  if (accessResult.hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access
  React.useEffect(() => {
    handleAccessDenied();
  }, [handleAccessDenied]);

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Hide mode - render nothing
  if (mode === 'hide') {
    return null;
  }

  // Banner mode - show inline upgrade banner
  if (mode === 'banner' && accessResult.feature) {
    return (
      <PaywallBanner
        feature={accessResult.feature}
        currentTier={tier}
        onUpgrade={onUpgrade ? () => onUpgrade(accessResult.upgradeTiers[0]) : undefined}
      />
    );
  }

  // Modal mode - show paywall modal
  if (mode === 'modal' && accessResult.feature) {
    return (
      <Paywall
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={accessResult.feature}
        currentTier={tier}
        upgradeTiers={accessResult.upgradeTiers}
        onUpgrade={onUpgrade}
      />
    );
  }

  // Fallback error state
  if (errorComponent) {
    return <>{errorComponent}</>;
  }

  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="mb-4 p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-[600] text-gray-900 mb-2">
          Feature Not Available
        </h3>
        <p className="text-sm text-gray-600">
          This feature is not available on your current plan.
        </p>
      </div>
    </div>
  );
}

/**
 * FeatureButton Component
 *
 * A button that checks feature access before executing an action.
 * Shows paywall if user doesn't have access.
 *
 * @example
 * ```tsx
 * <FeatureButton
 *   featureId="CONTRACTOR_BID_LIMIT"
 *   onClick={handleSubmitBid}
 * >
 *   Submit Bid
 * </FeatureButton>
 * ```
 */
interface FeatureButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  featureId: string;
  trackUsage?: boolean;
  onUpgrade?: (tier: SubscriptionTier) => void;
  children: React.ReactNode;
}

export function FeatureButton({
  featureId,
  trackUsage = true,
  onUpgrade,
  onClick,
  disabled,
  children,
  ...props
}: FeatureButtonProps) {
  const {
    hasAccess: checkAccess,
    trackUsage: trackUsageBase,
    loading,
    tier,
  } = useFeatureAccess();

  const [showPaywall, setShowPaywall] = useState(false);
  const accessResult = checkAccess(featureId);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Check access
    if (!accessResult.hasAccess) {
      e.preventDefault();
      setShowPaywall(true);
      return;
    }

    // Track usage if enabled
    if (trackUsage) {
      const tracked = await trackUsageBase(featureId);
      if (!tracked) {
        e.preventDefault();
        setShowPaywall(true);
        return;
      }
    }

    // Execute original onClick
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <button
        {...props}
        onClick={handleClick}
        disabled={disabled || loading}
      >
        {children}
      </button>

      {accessResult.feature && (
        <Paywall
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          feature={accessResult.feature}
          currentTier={tier}
          upgradeTiers={accessResult.upgradeTiers}
          onUpgrade={onUpgrade}
        />
      )}
    </>
  );
}

/**
 * FeatureBadge Component
 *
 * Shows a badge indicating feature availability/tier requirement
 *
 * @example
 * ```tsx
 * <FeatureBadge featureId="CONTRACTOR_SOCIAL_FEED" />
 * ```
 */
interface FeatureBadgeProps {
  featureId: string;
  showOnAvailable?: boolean;
}

export function FeatureBadge({ featureId, showOnAvailable = false }: FeatureBadgeProps) {
  const { hasAccess: checkAccess, tier } = useFeatureAccess();
  const accessResult = checkAccess(featureId);

  // Don't show badge if user has access and showOnAvailable is false
  if (accessResult.hasAccess && !showOnAvailable) {
    return null;
  }

  if (!accessResult.feature) {
    return null;
  }

  const tierColors = {
    trial: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    professional: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-emerald-100 text-emerald-700',
  };

  const firstUpgradeTier = accessResult.upgradeTiers[0] || tier;
  const color = tierColors[firstUpgradeTier];

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-[600]
        ${color}
      `}
    >
      {accessResult.hasAccess ? (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Available</span>
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>{firstUpgradeTier.charAt(0).toUpperCase() + firstUpgradeTier.slice(1)}+</span>
        </>
      )}
    </span>
  );
}

/**
 * withFeatureAccess HOC
 *
 * Higher-order component to wrap components with feature access
 *
 * @example
 * ```tsx
 * const ProtectedComponent = withFeatureAccess(
 *   MyComponent,
 *   'CONTRACTOR_SOCIAL_FEED'
 * );
 * ```
 */
export function withFeatureAccess<P extends object>(
  Component: React.ComponentType<P>,
  featureId: string,
  options?: Omit<FeatureGateProps, 'children' | 'featureId'>
) {
  const WrappedComponent = (props: P) => {
    return (
      <FeatureGate featureId={featureId} {...options}>
        <Component {...props} />
      </FeatureGate>
    );
  };

  WrappedComponent.displayName = `withFeatureAccess(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

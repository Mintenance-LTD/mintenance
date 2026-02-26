'use client';

import React from 'react';
import { Lock, Crown } from 'lucide-react';
import Link from 'next/link';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface FeatureGateCardProps {
  featureId: string;
  children?: React.ReactNode;
  title?: string;
  description?: string;
}

export function FeatureGateCard({ featureId, children, title, description }: FeatureGateCardProps) {
  const { hasAccess: checkAccess, loading, getFeature } = useFeatureAccess();

  const result = checkAccess(featureId);
  const feature = getFeature(featureId);
  const displayTitle = title || feature?.name || 'Premium Feature';
  const displayDescription = description || feature?.description || '';
  const upgradeMessage = feature?.upgradeMessage || 'Upgrade your plan to unlock this feature.';

  if (loading) {
    return (
      <div className="p-4 border border-gray-200 rounded-xl animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-full" />
      </div>
    );
  }

  if (result.hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Lock className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">{displayTitle}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{displayDescription}</p>
          <p className="text-xs text-gray-400 mt-1">{upgradeMessage}</p>
          <Link
            href="/subscription-plans"
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors"
          >
            <Crown className="w-3 h-3" />
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}

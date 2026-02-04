'use client';

import { useState } from 'react';
import { PlansHero } from './components/PlansHero';
import { PlanCards } from './components/PlanCards';
import { ROICalculator } from './components/ROICalculator';
import { FeatureComparisonTable } from './components/FeatureComparisonTable';
import { SuccessStories } from './components/SuccessStories';
import { PlatformFeeSavings } from './components/PlatformFeeSavings';
import { PlansFAQ } from './components/PlansFAQ';
import { PlansCTA } from './components/PlansCTA';

interface PlanFeature {
  id: string;
  name: string;
  price: number;
  priceAnnual: number;
  description: string;
  features: string[];
  cta: string;
  color: 'gray' | 'teal' | 'purple';
  popular: boolean;
  platformFee: string;
  savings?: string;
}

interface SubscriptionPlansClientProps {
  plans: PlanFeature[];
}

export function SubscriptionPlansClient({ plans }: SubscriptionPlansClientProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      <PlansHero isAnnual={isAnnual} setIsAnnual={setIsAnnual} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <PlanCards plans={plans} isAnnual={isAnnual} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        <ROICalculator />
        <PlatformFeeSavings />
        <FeatureComparisonTable plans={plans} />
        <SuccessStories />
        <PlansFAQ />
        <PlansCTA />
      </div>
    </div>
  );
}

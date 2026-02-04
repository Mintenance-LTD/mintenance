'use client';

import React from 'react';
import { ResourceHero } from './ResourceHero';
import { ResourceCategories } from './ResourceCategories';
import { FeaturedResources } from './FeaturedResources';
import { SuccessMetrics } from './SuccessMetrics';
import { QuickTipsSection } from './QuickTipsSection';
import { ResourcesCTA } from './ResourcesCTA';

/**
 * Main client component for the Resources page
 * Orchestrates all resource sections
 */
export function ResourcesClient() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      <ResourceHero />
      <ResourceCategories />
      <FeaturedResources />
      <SuccessMetrics />
      <QuickTipsSection />
      <ResourcesCTA />
    </div>
  );
}

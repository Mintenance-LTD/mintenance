'use client';

import React from 'react';
import { ResourceHero } from './ResourceHero';
import { ResourceCategories } from './ResourceCategories';
import { FeaturedResources } from './FeaturedResources';
import { QuickTipsSection } from './QuickTipsSection';
import { ResourcesCTA } from './ResourcesCTA';

/**
 * Main client component for the Resources page
 * Orchestrates all resource sections
 */
export function ResourcesClient() {
  return (
    <div
      data-theme='mint-editorial'
      className='min-h-screen'
      style={{
        background: 'var(--me-bg)',
        fontFamily: 'var(--me-font-body)',
      }}
    >
      <ResourceHero />
      <ResourceCategories />
      <FeaturedResources />
      <QuickTipsSection />
      <ResourcesCTA />
    </div>
  );
}

import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { logger } from '@mintenance/shared';
import { HeroSection } from './components/landing/HeroSection';
import { Footer2025 } from './components/landing/Footer2025';
import { LandingNavigation } from '@/components/landing/landing-navigation';
import { StatsSection } from '@/components/landing/stats-section';
import { BentoFeaturesSection } from '@/components/landing/bento-features-section';
import { ComparisonTable } from '@/components/landing/comparison-table';
import { HowItWorks } from '@/components/landing/how-it-works';
import { TrustIndicators } from '@/components/landing/trust-indicators';
import { FAQSection } from '@/components/landing/faq-section';
import { ContractorCTA } from '@/components/landing/contractor-cta';
import { FinalCTA } from '@/components/landing/final-cta';
import { ExitIntentModal } from '@/components/landing/exit-intent-modal';
import { AppPreviewSection } from '@/components/landing/app-preview-section';
import type { PlatformStats } from '@/components/landing/stats-section';

/**
 * MINTENANCE LANDING PAGE - SERVER-RENDERED
 * Stats fetched server-side for SEO and performance (no empty shell for crawlers).
 * Child components are "use client" for interactivity.
 */

export const metadata: Metadata = {
  title: 'Mintenance - Find Trusted Contractors For Your Home Projects',
  description: 'Connect with verified contractors for all your home maintenance needs. Get instant quotes, read reviews, and hire trusted professionals.',
  keywords: 'contractors, home maintenance, home repair, plumber, electrician, handyman, trusted contractors',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://mintenance.com',
    siteName: 'Mintenance',
    title: 'Mintenance - Find Trusted Contractors For Your Home Projects',
    description: 'Connect with verified contractors. Get instant quotes, compare prices, and hire trusted professionals.',
    images: [{
      url: 'https://mintenance.com/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'Mintenance - Your trusted home maintenance platform',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@mintenance',
    title: 'Mintenance - Find Trusted Local Contractors',
    description: 'Connect with verified contractors for all your home maintenance needs.',
  },
  alternates: {
    canonical: 'https://mintenance.com',
  },
};

const FALLBACK_STATS: PlatformStats = {
  activeContractors: 0,
  activeContractorsGrowth: 0,
  completedJobs: 0,
  completedJobsGrowth: 0,
  totalSaved: 0,
  totalSavedGrowth: 0,
  avgResponseTimeHours: 0,
  responseTimeImprovement: 0,
};

async function fetchPlatformStats(): Promise<{ stats: PlatformStats; hasRealStats: boolean }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/stats/platform`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (response.ok) {
      const data = await response.json();
      return { stats: data, hasRealStats: true };
    }
  } catch (error) {
    logger.error('Failed to fetch platform statistics:', error);
  }
  return { stats: FALLBACK_STATS, hasRealStats: false };
}

export default async function LandingPage() {
  const { stats, hasRealStats } = await fetchPlatformStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <LandingNavigation />

      <main id="main-content" className="pt-16">
        <HeroSection
          activeContractors={stats.activeContractors ?? null}
          hasRealStats={hasRealStats}
          statsLoading={false}
        />
        <AppPreviewSection />
        <StatsSection stats={stats} />
        <BentoFeaturesSection />
        <ComparisonTable />
        <HowItWorks />
        <TrustIndicators />
        <FAQSection />
        <ContractorCTA />
        <FinalCTA />
      </main>

      <Footer2025 />
      <ExitIntentModal />
    </div>
  );
}

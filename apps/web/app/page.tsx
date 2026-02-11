"use client";

import React, { useEffect, useState } from 'react';
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
import type { PlatformStats } from '@/components/landing/stats-section';

/**
 * MINTENANCE LANDING PAGE - PRODUCTION QUALITY
 * Inspired by Birch & Revealbot's Professional Design
 *
 * Colors: Navy Blue (#1E293B) + Mint Green (#14B8A6) + Amber Gold (#F59E0B)
 */

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

export default function LandingPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRealStats, setHasRealStats] = useState(false);

  // Fetch platform statistics from API (real contractor/user data only)
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats/platform');
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const data = await response.json();
          setStats(data);
          setHasRealStats(true);
        } else {
          setStats(FALLBACK_STATS);
          setHasRealStats(false);
        }
      } catch (error) {
        logger.error('Failed to fetch platform statistics:', error);
        setStats(FALLBACK_STATS);
        setHasRealStats(false);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Smooth scroll for hash links (only for same-page navigation)
  useEffect(() => {
    const handleHashClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="#"]') as HTMLAnchorElement;
      if (link && link.getAttribute('href')?.startsWith('#')) {
        const hash = link.getAttribute('href');
        if (hash && hash !== '#' && window.location.pathname === '/') {
          e.preventDefault();
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.history.pushState(null, '', hash);
          }
        }
      }
    };

    document.addEventListener('click', handleHashClick);
    return () => document.removeEventListener('click', handleHashClick);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <LandingNavigation />

      <main id="main-content" className="pt-16">
        <HeroSection
          activeContractors={stats?.activeContractors ?? null}
          hasRealStats={hasRealStats}
          statsLoading={loading}
        />
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

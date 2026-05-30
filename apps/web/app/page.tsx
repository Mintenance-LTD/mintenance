import type { Metadata } from 'next';
import { HeroSection } from './components/landing/HeroSection';
import { Footer2025 } from './components/landing/Footer2025';
import { LandingNavigation } from '@/components/landing/landing-navigation';
import { BentoFeaturesSection } from '@/components/landing/bento-features-section';
import { ComparisonTable } from '@/components/landing/comparison-table';
import { HowItWorks } from '@/components/landing/how-it-works';
import { TrustIndicators } from '@/components/landing/trust-indicators';
import { FAQSection } from '@/components/landing/faq-section';
import { ContractorCTA } from '@/components/landing/contractor-cta';
import { FinalCTA } from '@/components/landing/final-cta';

// 2026-05-13 Mint Editorial rebuild: AppPreviewSection was dropped —
// the new hero already shows the browser + phone "both platforms"
// mock, and the design-system landing spec has no separate
// app-preview section. Section order now follows redesign-v2/
// landing.html: hero → trust band → how-it-works → features →
// comparison → for-tradespeople → FAQ → closer.

/**
 * MINTENANCE LANDING PAGE - SERVER-RENDERED
 * Child components are "use client" for interactivity.
 */

export const metadata: Metadata = {
  title: 'Mintenance — Hire Local Tradespeople With Escrow-Protected Payments',
  description:
    'Post home maintenance jobs, compare local tradespeople on the platform, and keep payment protected in escrow until the work is approved.',
  keywords:
    'contractors, home maintenance, home repair, plumber, electrician, handyman, local tradespeople',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://mintenance.com',
    siteName: 'Mintenance',
    title:
      'Mintenance — Hire Local Tradespeople With Escrow-Protected Payments',
    description:
      'Post home maintenance jobs, compare local tradespeople on the platform, and keep payment protected in escrow until the work is approved.',
    images: [
      {
        url: 'https://mintenance.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Mintenance — modern home maintenance platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@mintenance',
    title: 'Mintenance — Hire Local Tradespeople',
    description:
      'Post jobs, compare local tradespeople, and protect payment in escrow until sign-off.',
  },
  alternates: {
    canonical: 'https://mintenance.com',
  },
};

export default function LandingPage() {
  return (
    <div
      className='min-h-screen'
      data-theme='mint-editorial'
      style={{ background: 'var(--me-bg)' }}
    >
      <LandingNavigation />

      {/* No top padding — LandingNavigation is `position: sticky`
          (Mint Editorial rebuild), so it occupies layout flow and
          no longer needs a fixed-nav offset. */}
      <main id='main-content'>
        <HeroSection />
        <TrustIndicators />
        <HowItWorks />
        <BentoFeaturesSection />
        <ComparisonTable />
        <ContractorCTA />
        <FAQSection />
        <FinalCTA />
      </main>

      <Footer2025 />
    </div>
  );
}

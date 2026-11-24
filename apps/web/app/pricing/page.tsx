import type { Metadata } from 'next';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PricingClient } from './components/PricingClient';

export const metadata: Metadata = {
  title: 'Pricing Plans - Transparent & Affordable | Mintenance',
  description:
    'Simple, transparent pricing for homeowners and contractors. Free plans available. No hidden fees, cancel anytime. Pay-as-you-go for contractors with low platform fees.',
  keywords:
    'pricing, subscription plans, contractor fees, homeowner plans, affordable, transparent pricing, no hidden fees',
  openGraph: {
    title: 'Pricing Plans - Transparent & Affordable | Mintenance',
    description:
      'Compare free and paid plans for homeowners, letting agents and contractors. Contractor platform fees apply to completed work.',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Mintenance Pricing Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing Plans | Mintenance',
    description:
      'Transparent pricing with free plans available. No hidden fees, cancel anytime.',
  },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  const { audience } = await searchParams;
  return (
    <ErrorBoundary componentName='PricingPage'>
      <div>
        <LandingNavigation />
        <main id='main-content' tabIndex={-1}>
          <PricingClient
            initialAudience={
              audience === 'contractor' ? 'contractor' : 'homeowner'
            }
          />
        </main>
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}

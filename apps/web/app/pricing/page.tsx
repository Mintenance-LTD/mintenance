import type { Metadata } from 'next';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PricingClient } from './components/PricingClient';

export const metadata: Metadata = {
  title: 'Pricing Plans - Transparent & Affordable | Mintenance',
  description: 'Simple, transparent pricing for homeowners and contractors. Free plans available. No hidden fees, cancel anytime. Pay-as-you-go for contractors with low platform fees.',
  keywords: 'pricing, subscription plans, contractor fees, homeowner plans, affordable, transparent pricing, no hidden fees',
  openGraph: {
    title: 'Pricing Plans - Transparent & Affordable | Mintenance',
    description: 'Choose the plan that works best for you. Free plans available for homeowners. Contractors pay low platform fees only when they win jobs.',
    type: 'website',
    images: [
      {
        url: '/og-pricing.jpg',
        width: 1200,
        height: 630,
        alt: 'Mintenance Pricing Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing Plans | Mintenance',
    description: 'Transparent pricing with free plans available. No hidden fees, cancel anytime.',
  },
};

export default function PricingPage() {
  return (
    <ErrorBoundary componentName="PricingPage">
      <div>
        <LandingNavigation />
        <main id="main-content" tabIndex={-1}>
          <PricingClient />
        </main>
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}

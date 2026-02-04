import type { Metadata } from 'next';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TryMintAIClient } from './components/TryMintAIClient';

export const metadata: Metadata = {
  title: 'Try Mint AI - Free Property Damage Assessment | Mintenance',
  description: 'Upload photos and get instant AI-powered damage assessment with cost estimates. Try our building surveyor AI for free - no login required.',
  keywords: 'mint ai, ai damage assessment, property damage ai, building surveyor ai, free assessment, instant cost estimate, property inspection ai',
  openGraph: {
    title: 'Try Mint AI - Free Property Damage Assessment | Mintenance',
    description: 'Upload photos of property damage and get instant AI-powered cost estimates. Powered by advanced computer vision technology.',
    type: 'website',
    images: [
      {
        url: '/og-mint-ai.jpg',
        width: 1200,
        height: 630,
        alt: 'Mint AI - AI-Powered Property Assessment',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Try Mint AI | Free Property Assessment',
    description: 'Upload photos and get instant AI-powered damage assessment with cost estimates.',
  },
};

export default function TryMintAIPage() {
  return (
    <ErrorBoundary componentName="TryMintAIPage">
      <div className="min-h-screen bg-gray-50">
        <LandingNavigation />
        <main id="main-content" tabIndex={-1}>
          <TryMintAIClient />
        </main>
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}

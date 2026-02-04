import type { Metadata } from 'next';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HowItWorksClient } from './components/HowItWorksClient';

export const metadata: Metadata = {
  title: 'How It Works - Simple 3-Step Process | Mintenance',
  description: 'Learn how Mintenance works. Post a job, get matched with verified contractors, and hire the best professional for your home maintenance needs in 3 simple steps.',
  keywords: 'how it works, process, steps, homeowners, contractors, platform guide, getting started',
  openGraph: {
    title: 'How It Works - Simple 3-Step Process | Mintenance',
    description: 'Post a job, get matched with verified contractors, and hire the best professional for your home maintenance needs.',
    type: 'website',
    images: [
      {
        url: '/og-how-it-works.jpg',
        width: 1200,
        height: 630,
        alt: 'How Mintenance Works',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How It Works | Mintenance',
    description: 'Simple 3-step process to connect homeowners with trusted contractors.',
  },
};

export default function HowItWorksPage() {
  return (
    <ErrorBoundary componentName="HowItWorksPage">
      <div>
        <LandingNavigation />
        <main id="main-content" tabIndex={-1}>
          <HowItWorksClient />
        </main>
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}

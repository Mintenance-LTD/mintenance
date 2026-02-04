import type { Metadata } from 'next';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ResourcesClient } from './components/ResourcesClient';

export const metadata: Metadata = {
  title: 'Contractor Resources & Growth Tools | Mintenance',
  description: 'Essential resources for contractors. Learn how to grow your business, win more jobs, improve your profile, and succeed on the Mintenance platform.',
  keywords: 'contractor resources, business guides, contractor tips, professional development, platform guides, contractor success',
  openGraph: {
    title: 'Contractor Resources & Growth Tools | Mintenance',
    description: 'Essential resources to help contractors grow their business and succeed on our platform.',
    type: 'website',
    images: [
      {
        url: '/og-resources.jpg',
        width: 1200,
        height: 630,
        alt: 'Mintenance Contractor Resources',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contractor Resources | Mintenance',
    description: 'Essential resources for contractors to grow their business and win more jobs.',
  },
};

export default function ResourcesPage() {
  return (
    <ErrorBoundary componentName="ResourcesPage">
      <div>
        <LandingNavigation />
        <ResourcesClient />
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}

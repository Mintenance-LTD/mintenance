import type { Metadata } from 'next';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BlogClient } from './components/BlogClient';

export const metadata: Metadata = {
  title: 'Blog - Home Maintenance Tips & Guides | Mintenance',
  description: 'Expert home maintenance tips, contractor guides, and industry insights. Learn from professionals about repairs, renovations, and keeping your home in perfect condition.',
  keywords: 'home maintenance blog, DIY tips, contractor advice, renovation guides, home improvement, property maintenance',
  openGraph: {
    title: 'Blog - Home Maintenance Tips & Guides | Mintenance',
    description: 'Expert home maintenance tips, contractor guides, and industry insights from professionals.',
    type: 'website',
    images: [
      {
        url: '/og-blog.jpg',
        width: 1200,
        height: 630,
        alt: 'Mintenance Blog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | Mintenance',
    description: 'Expert home maintenance tips, contractor guides, and industry insights.',
  },
};

export default function BlogPage() {
  return (
    <ErrorBoundary componentName="BlogPage">
      <div>
        <LandingNavigation />
        <BlogClient />
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}

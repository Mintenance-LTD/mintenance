import { ContractorsBrowseProfessional } from './components/ContractorsBrowseProfessional';
import { getFeaturedContractors, getPlatformStats } from '@/lib/queries/airbnb-optimized';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Trusted Local Contractors | Mintenance',
  description: 'Browse and hire verified contractors for all your home maintenance needs. Read reviews, compare prices, and connect with trusted professionals near you.',
  keywords: 'find contractors, local contractors, verified professionals, home maintenance, trusted tradespeople, contractor reviews',
  openGraph: {
    title: 'Find Trusted Local Contractors | Mintenance',
    description: 'Browse and hire verified contractors for all your home maintenance needs.',
    type: 'website',
    images: [
      {
        url: '/og-contractors.jpg',
        width: 1200,
        height: 630,
        alt: 'Find Contractors on Mintenance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find Contractors | Mintenance',
    description: 'Browse verified contractors near you. Compare ratings, reviews, and portfolios.',
  },
};

export default async function ContractorsPage() {
  const contractors = await getFeaturedContractors(50);
  const platformStats = await getPlatformStats();

  const formattedContractors = contractors.map(contractor => ({
    id: contractor.id,
    name: contractor.name,
    company_name: contractor.company_name,
    city: contractor.city,
    profile_image: contractor.profile_image,
    hourly_rate: contractor.hourly_rate,
    rating: contractor.rating,
    review_count: contractor.review_count,
    verified: contractor.verified,
    skills: contractor.skills,
    completed_jobs: contractor.completed_jobs,
    response_time: contractor.response_time,
  }));

  return (
    <ErrorBoundary componentName="ContractorsPage">
      <div>
        <LandingNavigation />
        <ContractorsBrowseProfessional
          contractors={formattedContractors}
          totalCount={platformStats.totalContractors}
        />
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}

import { ContractorsBrowseProfessional } from './components/ContractorsBrowseProfessional';
import { getFeaturedContractors, getPlatformStats } from '@/lib/queries/airbnb-optimized';
import type { Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Find Contractors | Mintenance',
  description: 'Browse verified contractors near you. Compare ratings, reviews, and portfolios to find the perfect professional for your project.',
  openGraph: {
    title: 'Find Contractors | Mintenance',
    description: 'Browse verified contractors near you',
    type: 'website',
  },
};

export default async function ContractorsPage() {
  // Use optimized query for contractors
  const contractors = await getFeaturedContractors(50);
  const platformStats = await getPlatformStats();

  // Format for Professional component
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
    <ContractorsBrowseProfessional
      contractors={formattedContractors}
      totalCount={platformStats.totalContractors}
    />
  );
}

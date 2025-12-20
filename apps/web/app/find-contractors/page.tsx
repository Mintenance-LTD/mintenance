import { serverSupabase } from '@/lib/api/supabaseServer';
import { FindContractorsClient } from './components/FindContractorsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Trusted Contractors | Mintenance',
  description: 'Connect with verified professionals for your home improvement projects. Browse contractors by specialty, location, and ratings.',
  openGraph: {
    title: 'Find Trusted Contractors | Mintenance',
    description: 'Connect with verified professionals for your home improvement projects',
    type: 'website',
  },
};

export default async function FindContractorsPage() {
  // Fetch contractors with their related data
  const { data: contractors } = await serverSupabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      company_name,
      profile_image_url,
      city,
      country,
      admin_verified,
      created_at,
      contractor_skills (
        skill_name,
        skill_icon,
        skill_category
      )
    `)
    .eq('role', 'contractor')
    .eq('is_active', true)
    .order('admin_verified', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  // Get contractor IDs for batch queries
  const contractorIds = contractors?.map(c => c.id) || [];

  // Fetch reviews and job stats in parallel
  const [reviewsData, jobsData] = await Promise.all([
    serverSupabase
      .from('reviews')
      .select('contractor_id, rating')
      .in('contractor_id', contractorIds),
    serverSupabase
      .from('jobs')
      .select('contractor_id, status')
      .in('contractor_id', contractorIds)
      .eq('status', 'completed'),
  ]);

  // Calculate stats for each contractor
  const contractorStats = new Map();

  // Process reviews
  reviewsData.data?.forEach(review => {
    if (!contractorStats.has(review.contractor_id)) {
      contractorStats.set(review.contractor_id, { ratings: [], completedJobs: 0 });
    }
    contractorStats.get(review.contractor_id).ratings.push(review.rating);
  });

  // Process completed jobs
  jobsData.data?.forEach(job => {
    if (!contractorStats.has(job.contractor_id)) {
      contractorStats.set(job.contractor_id, { ratings: [], completedJobs: 0 });
    }
    contractorStats.get(job.contractor_id).completedJobs++;
  });

  // Format contractors for client component
  const formattedContractors = contractors?.map(contractor => {
    const stats = contractorStats.get(contractor.id) || { ratings: [], completedJobs: 0 };
    const avgRating = stats.ratings.length > 0
      ? stats.ratings.reduce((sum: number, r: number) => sum + r, 0) / stats.ratings.length
      : 0;

    const skills = Array.isArray(contractor.contractor_skills)
      ? contractor.contractor_skills
      : [];

    return {
      id: contractor.id,
      name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'Unknown',
      company: contractor.company_name || undefined,
      specialties: skills.map(s => s.skill_name),
      rating: avgRating,
      reviews: stats.ratings.length,
      location: `${contractor.city || ''}, ${contractor.country || ''}`.trim() || 'Location not specified',
      verified: contractor.admin_verified || false,
      completedJobs: stats.completedJobs,
      hourlyRate: undefined, // This can be added to the database if needed
      avatar: contractor.profile_image_url,
    };
  }) || [];

  return <FindContractorsClient contractors={formattedContractors} />;
}

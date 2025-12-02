import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { ContractorProfileClient2025 } from './components/ContractorProfileClient2025';
import { redirect } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ContractorProfilePage2025() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch all data in parallel
  const [contractorResult, skillsResult, reviewsResult, completedJobsResult, postsResult, bidsResult] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('contractor_skills')
      .select('skill_name, skill_icon')
      .eq('contractor_id', user.id),
    supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id (
          first_name,
          last_name,
          profile_image_url
        ),
        job:job_id (
          title,
          category
        )
      `)
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select('id, title, category, budget, completed_at, photos')
      .eq('contractor_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(20),
    supabase
      .from('contractor_posts')
      .select('*')
      .eq('contractor_id', user.id)
      .in('post_type', ['portfolio', 'work_showcase'])
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('bids')
      .select('id, status, bid_amount')
      .eq('contractor_id', user.id),
  ]);

  const contractor = contractorResult.data;
  const skills = skillsResult.data || [];
  const reviews = reviewsResult.data || [];
  const completedJobs = completedJobsResult.data || [];
  const posts = postsResult.data || [];
  const bids = bidsResult.data || [];

  // Calculate profile completion
  const profileFields = [
    contractor?.first_name,
    contractor?.last_name,
    contractor?.bio,
    contractor?.city,
    contractor?.country,
    contractor?.profile_image_url,
    contractor?.company_name,
    contractor?.license_number,
    skills.length > 0,
  ];

  const completedFields = profileFields.filter(Boolean).length;
  const profileCompletion = Math.round((completedFields / profileFields.length) * 100);

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  // Calculate win rate
  const totalBidsWithDecision = bids.filter(b => b.status === 'accepted' || b.status === 'rejected').length;
  const acceptedBids = bids.filter(b => b.status === 'accepted').length;
  const winRate = totalBidsWithDecision > 0
    ? Math.round((acceptedBids / totalBidsWithDecision) * 100)
    : 0;

  // Calculate total earnings
  const totalEarnings = bids
    .filter(b => b.status === 'accepted')
    .reduce((sum, b) => sum + (b.bid_amount || 0), 0);

  return (
    <ContractorProfileClient2025
      contractor={{
        id: contractor?.id || user.id,
        first_name: contractor?.first_name,
        last_name: contractor?.last_name,
        email: contractor?.email || user.email,
        bio: contractor?.bio,
        city: contractor?.city,
        country: contractor?.country,
        profile_image_url: contractor?.profile_image_url,
        company_name: contractor?.company_name,
        license_number: contractor?.license_number,
        admin_verified: contractor?.admin_verified || false,
        created_at: contractor?.created_at,
      }}
      skills={skills}
      reviews={reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        reviewer: Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer,
        job: Array.isArray(r.job) ? r.job[0] : r.job,
      }))}
      completedJobs={completedJobs}
      posts={posts}
      metrics={{
        profileCompletion,
        averageRating,
        totalReviews: reviews.length,
        jobsCompleted: completedJobs.length,
        winRate,
        totalEarnings,
        totalBids: bids.length,
      }}
    />
  );
}

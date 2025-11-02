import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { ContractorProfileClient } from './components/ContractorProfileClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ContractorProfilePage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    return null;
  }

  const { data: contractor } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: skills } = await supabase
    .from('contractor_skills')
    .select('skill_name, skill_icon')
    .eq('contractor_id', user.id);

  const { data: reviews } = await supabase
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
    .order('created_at', { ascending: false });

  const { data: completedJobs } = await supabase
    .from('jobs')
    .select('*, photos')
    .eq('contractor_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20);

  const { data: posts } = await supabase
    .from('contractor_posts')
    .select('*')
    .eq('contractor_id', user.id)
    .eq('post_type', 'work_showcase')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20);

  const profileFields = [
    contractor?.first_name,
    contractor?.last_name,
    contractor?.bio,
    contractor?.city,
    contractor?.country,
    contractor?.profile_image_url,
    skills && skills.length > 0,
  ];

  const completedFields = profileFields.filter(Boolean).length;
  const profileCompletion = Math.round((completedFields / profileFields.length) * 100);

  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  return (
    <ContractorProfileClient
      contractor={contractor}
      skills={skills || []}
      reviews={reviews || []}
      completedJobs={completedJobs || []}
      posts={posts || []}
      metrics={{
        profileCompletion,
        averageRating,
        totalReviews: reviews?.length ?? 0,
        jobsCompleted: completedJobs?.length ?? 0,
      }}
    />
  );
}

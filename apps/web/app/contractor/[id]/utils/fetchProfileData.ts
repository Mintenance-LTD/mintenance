import { serverSupabase } from '@/lib/api/supabaseServer';
import type {
  Contractor,
  Review,
  CompletedJob,
  PortfolioPost,
  ContractorProfileData,
} from '../types';

/**
 * Fetches everything the public contractor profile page needs.
 * Extracted from `page.tsx` 2026-05-09 (AUDIT_PUNCH_LIST P2 #43).
 *
 * Returns `null` when the contractor doesn't exist / is not in
 * contractor role / is soft-deleted — caller should `notFound()`.
 *
 * The 4 independent queries (profile, reviews, jobs, posts) run in
 * parallel via Promise.all so the slowest one bounds page TTFB.
 */
export async function fetchContractorProfileData(
  contractorId: string
): Promise<ContractorProfileData | null> {
  const [contractorResult, reviewsResult, jobsResult, postsResult] =
    await Promise.all([
      serverSupabase
        .from('profiles')
        .select(
          `
          *,
          contractor_skills(skill_name)
        `
        )
        .eq('id', contractorId)
        .eq('role', 'contractor')
        .is('deleted_at', null)
        .single(),
      serverSupabase
        .from('reviews')
        .select(
          `
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
        `
        )
        .eq('reviewee_id', contractorId)
        .order('created_at', { ascending: false })
        .limit(10),
      serverSupabase
        .from('jobs')
        .select('id, title, category, photos, completed_at')
        .eq('contractor_id', contractorId)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('completed_at', { ascending: false })
        .limit(12),
      serverSupabase
        .from('contractor_posts')
        .select('id, title, images, post_type, project_duration, project_cost')
        .eq('contractor_id', contractorId)
        .eq('post_type', 'work_showcase')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

  if (contractorResult.error || !contractorResult.data) {
    return null;
  }

  const contractor = contractorResult.data as Contractor;
  const reviews = (reviewsResult.data ?? []) as Review[];
  const completedJobs = (jobsResult.data ?? []) as CompletedJob[];
  const posts = (postsResult.data ?? []) as PortfolioPost[];

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : (contractor.rating ?? 0);

  return { contractor, reviews, completedJobs, posts, avgRating };
}

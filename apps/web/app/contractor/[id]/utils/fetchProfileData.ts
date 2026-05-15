import { serverSupabase } from '@/lib/api/supabaseServer';
import { resignJobStorageUrls } from '@/lib/api/job-storage';
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
 * 2026-05-13 portfolio audit fix: each `completedJob` now carries
 * the contractor's after-photos (from `job_photos_metadata`) instead
 * of the legacy `jobs.photos` column — that column holds the
 * homeowner's original posting photos which are the WRONG photos to
 * show as portfolio. After-photos are the "finished work" shots the
 * contractor uploaded on completion.
 *
 * The independent queries run in parallel via Promise.all so the
 * slowest one bounds page TTFB; the after-photo fetch is a serial
 * follow-up once we know the completed job ids.
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
        .select('id, title, category, completed_at')
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
  const rawJobs = (jobsResult.data ?? []) as Array<{
    id: string;
    title?: string | null;
    category?: string | null;
    completed_at?: string | null;
  }>;
  const posts = (postsResult.data ?? []) as PortfolioPost[];

  // Pull after-photos for the completed jobs and attach them to each
  // CompletedJob row. Re-sign Job-storage URLs since the bucket is
  // private (2026-04-17). Failures are swallowed — the page still
  // renders the job row with an empty photos array which simply
  // hides the tile, no error.
  const completedJobs: CompletedJob[] = rawJobs.map((j) => ({
    id: j.id,
    title: j.title,
    category: j.category,
    completed_at: j.completed_at,
    photos: [],
  }));
  if (rawJobs.length > 0) {
    try {
      const jobIds = rawJobs.map((j) => j.id);
      const { data: afterPhotos } = await serverSupabase
        .from('job_photos_metadata')
        .select('job_id, photo_url, timestamp')
        .in('job_id', jobIds)
        .eq('photo_type', 'after')
        .order('timestamp', { ascending: false });

      const byJob = new Map<string, string[]>();
      for (const row of (afterPhotos ?? []) as Array<{
        job_id: string;
        photo_url: string;
      }>) {
        if (!row.photo_url) continue;
        const list = byJob.get(row.job_id) ?? [];
        list.push(row.photo_url);
        byJob.set(row.job_id, list);
      }
      const allRawUrls = Array.from(byJob.values()).flat();
      const signed = await resignJobStorageUrls(allRawUrls);
      const signedByRaw = new Map<string, string>();
      allRawUrls.forEach((raw, i) => signedByRaw.set(raw, signed[i]));

      for (const job of completedJobs) {
        const rawList = byJob.get(job.id) ?? [];
        job.photos = rawList
          .map((u) => signedByRaw.get(u))
          .filter((u): u is string => Boolean(u));
      }
    } catch {
      // Non-fatal — leave photos as empty arrays. Audit-friendly:
      // tile silently disappears rather than rendering a broken
      // placeholder.
    }
  }

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : (contractor.rating ?? 0);

  return { contractor, reviews, completedJobs, posts, avgRating };
}

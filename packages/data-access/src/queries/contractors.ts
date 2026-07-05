/**
 * Contractor query definitions — consistent across web and mobile.
 *
 * Key fix: Contractor stats are now computed with a shared function
 * instead of mobile doing 3 separate Supabase queries with client-side math.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Query functions ─────────────────────────────────────────────

// NOTE (2026-07-04): fetchContractorProfile / CONTRACTOR_PROFILE_SELECT
// were deleted — they queried the retired contractor-profiles side
// table with columns that never existed there (user_id, skills, bio,
// ...), had zero callers on web or mobile, and mobile's
// ContractorProfileService.getContractorProfile() already routes
// through GET /api/contractor/profile-data (profiles-backed).

/**
 * Compute contractor stats from the database.
 *
 * Previously: mobile ran 3 separate queries + client-side math.
 * Now: one shared function that both platforms can use.
 * Note: for API route usage, this runs server-side. For mobile direct
 * usage, it runs client-side but with consistent logic.
 */
export async function fetchContractorStats(
  client: SupabaseClient,
  contractorId: string
) {
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  ).toISOString();

  const [jobsResult, reviewsResult, todayJobsResult] = await Promise.all([
    client
      .from('jobs')
      .select('id, status, budget, created_at, updated_at')
      .eq('contractor_id', contractorId),
    client.from('reviews').select('rating').eq('reviewee_id', contractorId),
    client
      .from('jobs')
      .select(
        'id, title, location, scheduled_start_date, homeowner:profiles!homeowner_id(first_name, last_name)'
      )
      .eq('contractor_id', contractorId)
      .in('status', ['assigned', 'in_progress'])
      .gte('scheduled_start_date', todayStart)
      .lte('scheduled_start_date', todayEnd),
  ]);

  const jobs = jobsResult.data ?? [];
  const reviews = reviewsResult.data ?? [];
  const todayJobs = todayJobsResult.data ?? [];

  const activeJobs = jobs.filter(
    (j) => j.status === 'in_progress' || j.status === 'assigned'
  ).length;

  const completedJobs = jobs.filter((j) => j.status === 'completed').length;

  const monthlyEarnings = jobs
    .filter(
      (j) =>
        j.status === 'completed' && j.updated_at && j.updated_at >= monthStart
    )
    .reduce((sum, j) => sum + (j.budget || 0), 0);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

  const totalJobs = jobs.length;
  const successRate =
    totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  return {
    activeJobs,
    completedJobs,
    monthlyEarnings,
    avgRating: Math.round(avgRating * 10) / 10,
    totalReviews: reviews.length,
    successRate,
    todaysAppointments: todayJobs,
  };
}

/**
 * Fetch contractor reviews with reviewer details.
 */
export async function fetchContractorReviews(
  client: SupabaseClient,
  contractorId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 20, offset = 0 } = options;

  return client
    .from('reviews')
    .select(
      'id, rating, comment, created_at, reviewer:profiles!reviewer_id(first_name, last_name, profile_image_url)'
    )
    .eq('reviewee_id', contractorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

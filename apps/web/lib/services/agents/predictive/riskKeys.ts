import { serverSupabase } from '@/lib/api/supabaseServer';
import type { JobForRisk, RiskType } from './types';

/**
 * Extract risk keys for memory queries.
 * Keys: Job features, contractor history, timing factors.
 * Returns a normalized 24-element numeric vector.
 */
export async function extractRiskKeys(
  jobId: string,
  contractorId: string,
  riskType: RiskType,
  job?: JobForRisk | null
): Promise<number[]> {
  const keys: number[] = [];

  // Get job details if not provided
  let jobData = job;
  if (!jobData) {
    const { data: fetchedJob } = await serverSupabase
      .from('jobs')
      .select(
        'id, budget, category, scheduled_start_date, contractor_id, homeowner_id'
      )
      .eq('id', jobId)
      .single();
    jobData = fetchedJob as JobForRisk | null;
  }

  // Get contractor features
  const { data: contractor } = await serverSupabase
    .from('profiles')
    .select('id, rating, total_jobs_completed')
    .eq('id', contractorId)
    .single();

  // Get contractor history
  const { data: contractorJobs } = await serverSupabase
    .from('jobs')
    .select('id, status, scheduled_start_date')
    .eq('contractor_id', contractorId)
    .in('status', ['assigned', 'in_progress', 'completed', 'cancelled']);

  // Normalize features to 0-1 range
  keys.push((contractor?.rating || 0) / 5); // Rating
  keys.push(Math.min((contractor?.total_jobs_completed || 0) / 100, 1)); // Experience
  // 2026-05-23: budget feature degraded — see LearningMatchingService
  // for the same note. Open-bidding rollout means `jobs.budget` is
  // NULL for new posts; this feature is effectively dead until the
  // risk model is retrained on accepted-bid amounts.
  keys.push(Math.min((jobData?.budget ?? 0) / 5000, 1));
  keys.push(jobData?.category ? 1 : 0); // Has category

  // Timing factors
  if (jobData?.scheduled_start_date) {
    const scheduledDate = new Date(jobData.scheduled_start_date);
    const now = new Date();
    const hoursUntilStart =
      (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    keys.push(Math.min(Math.max(hoursUntilStart / 168, 0), 1)); // Normalize to 0-1 (1 week)
  } else {
    keys.push(0);
  }

  // Contractor history features
  const totalJobs = contractorJobs?.length || 0;
  keys.push(Math.min(totalJobs / 50, 1)); // Total jobs
  const cancelledJobs =
    contractorJobs?.filter((j) => j.status === 'cancelled').length || 0;
  keys.push(totalJobs > 0 ? cancelledJobs / totalJobs : 0); // Cancellation rate

  // Risk type encoding
  const riskTypeMap = {
    'no-show': 0.25,
    dispute: 0.5,
    delay: 0.75,
    quality: 1.0,
  };
  keys.push(riskTypeMap[riskType] || 0);

  // Pad to expected input size (24 features)
  while (keys.length < 24) {
    keys.push(0);
  }

  return keys.slice(0, 24);
}

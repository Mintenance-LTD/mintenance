import { serverSupabase } from '@/lib/api/supabaseServer';
import type { JobMetricsRow, BidWithJobRow } from './types';

export async function getJobMetrics(contractorId: string) {
  const { data: jobs, error } = await serverSupabase
    .from('jobs')
    .select('id, status, created_at, updated_at')
    .eq('contractor_id', contractorId)
    .returns<JobMetricsRow[]>();

  if (error) throw error;

  const jobRows = jobs ?? [];
  const totalJobs = jobRows.length;
  const completedJobs = jobRows.filter(
    (job) => job.status === 'completed'
  ).length;
  const activeJobs = jobRows.filter(
    (job) => job.status === 'in_progress'
  ).length;
  const pendingJobs = jobRows.filter((job) => job.status === 'assigned').length;
  const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

  return {
    totalJobs,
    completedJobs,
    activeJobs,
    pendingJobs,
    completionRate,
  };
}

export async function getResponseMetrics(contractorId: string) {
  const { data: bids, error: bidsError } = await serverSupabase
    .from('bids')
    .select(
      `
      id, created_at, status,
      jobs!inner(created_at)
    `
    )
    .eq('contractor_id', contractorId)
    .returns<BidWithJobRow[]>();

  if (bidsError) throw bidsError;

  const bidRows = bids ?? [];
  let totalResponseTime = 0;
  let responseCount = 0;

  bidRows.forEach((bid: BidWithJobRow) => {
    const jobCreatedAt = bid.jobs?.[0]?.created_at;
    if (!jobCreatedAt) {
      return;
    }

    const jobTime = new Date(jobCreatedAt).getTime();
    const bidTime = new Date(bid.created_at).getTime();
    const responseTime = (bidTime - jobTime) / (1000 * 60 * 60);

    if (responseTime > 0) {
      totalResponseTime += responseTime;
      responseCount += 1;
    }
  });

  const averageResponseTime =
    responseCount > 0 ? totalResponseTime / responseCount : 0;

  const { data: successfulJobs, error: successError } = await serverSupabase
    .from('jobs')
    .select('id')
    .eq('contractor_id', contractorId)
    .eq('status', 'completed')
    .returns<{ id: string }[]>();

  if (successError) throw successError;

  const successfulJobsCount = (successfulJobs ?? []).length;
  const totalBids = bidRows.length;
  const jobSuccessRate =
    totalBids > 0 ? (successfulJobsCount / totalBids) * 100 : 0;

  const { data: repeatCustomers, error: returnError } = await serverSupabase
    .from('jobs')
    .select('homeowner_id')
    .eq('contractor_id', contractorId)
    .eq('status', 'completed')
    .returns<{ homeowner_id: string }[]>();

  if (returnError) throw returnError;

  const repeatRows = repeatCustomers ?? [];
  const uniqueCustomers = new Set(repeatRows.map((job) => job.homeowner_id))
    .size;
  const totalCompletedJobs = repeatRows.length;
  const customerReturnRate =
    totalCompletedJobs > 0
      ? ((totalCompletedJobs - uniqueCustomers) / totalCompletedJobs) * 100
      : 0;

  return {
    averageResponseTime,
    jobSuccessRate,
    customerReturnRate,
  };
}

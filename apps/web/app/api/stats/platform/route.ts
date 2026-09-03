import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/stats/platform
 * Returns platform-wide statistics for the landing page
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 30 } },
  async () => {
    const now = new Date();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch all statistics in parallel
    const [
      activeContractorsResponse,
      activeContractorsLastMonthResponse,
      completedJobsResponse,
      completedJobsLastMonthResponse,
      avgResponseTimeResponse,
    ] = await Promise.all([
      serverSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'contractor')
        .eq('admin_verified', true),
      serverSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'contractor')
        .eq('admin_verified', true)
        .lte('created_at', endOfLastMonth.toISOString()),
      serverSupabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      serverSupabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .lte('updated_at', endOfLastMonth.toISOString()),
      serverSupabase
        .from('jobs')
        .select('id, created_at')
        .eq('status', 'completed')
        .limit(1000),
    ]);

    // Get first bid/message timestamps for response time calculation
    const completedJobsForResponseTime = avgResponseTimeResponse.data || [];
    const jobIds = completedJobsForResponseTime
      .slice(0, 500)
      .map((job) => job.id);

    const { data: firstBids } = await serverSupabase
      .from('bids')
      .select('job_id, created_at')
      .in('job_id', jobIds)
      .order('created_at', { ascending: true });

    const firstBidMap = new Map<string, Date>();
    if (firstBids) {
      const bidsByJob = new Map<string, Date>();
      firstBids.forEach((bid) => {
        if (!bidsByJob.has(bid.job_id)) {
          bidsByJob.set(bid.job_id, new Date(bid.created_at));
        }
      });
      bidsByJob.forEach((date, jobId) => firstBidMap.set(jobId, date));
    }

    const { data: firstMessages } = await serverSupabase
      .from('messages')
      .select('job_id, created_at')
      .in('job_id', jobIds)
      .order('created_at', { ascending: true });

    const firstMessageMap = new Map<string, Date>();
    if (firstMessages) {
      const messagesByJob = new Map<string, Date>();
      firstMessages.forEach((message) => {
        if (!messagesByJob.has(message.job_id)) {
          messagesByJob.set(message.job_id, new Date(message.created_at));
        }
      });
      messagesByJob.forEach((date, jobId) => firstMessageMap.set(jobId, date));
    }

    // Calculate response times
    const responseTimes: number[] = [];
    completedJobsForResponseTime.slice(0, 500).forEach((job) => {
      const jobCreatedAt = new Date(job.created_at).getTime();
      const firstBidTime = firstBidMap.get(job.id)?.getTime();
      const firstMessageTime = firstMessageMap.get(job.id)?.getTime();

      if (firstBidTime || firstMessageTime) {
        const earliestResponse = Math.min(
          firstBidTime || Infinity,
          firstMessageTime || Infinity
        );
        if (earliestResponse !== Infinity) {
          const responseTimeHours =
            (earliestResponse - jobCreatedAt) / (1000 * 60 * 60);
          if (responseTimeHours > 0 && responseTimeHours < 168) {
            responseTimes.push(responseTimeHours);
          }
        }
      }
    });

    // Calculate statistics
    const activeContractors = activeContractorsResponse.count || 0;
    const activeContractorsLastMonth =
      activeContractorsLastMonthResponse.count || 0;
    const contractorsGrowth =
      activeContractorsLastMonth > 0
        ? Math.round(
            ((activeContractors - activeContractorsLastMonth) /
              activeContractorsLastMonth) *
              100
          )
        : 0;

    const completedJobs = completedJobsResponse.count || 0;
    const completedJobsLastMonth = completedJobsLastMonthResponse.count || 0;
    const jobsGrowth =
      completedJobsLastMonth > 0
        ? Math.round(
            ((completedJobs - completedJobsLastMonth) /
              completedJobsLastMonth) *
              100
          )
        : 0;

    // Do not manufacture savings or response-time claims when the source
    // data is missing. A measured aggregate can be added later without
    // changing the endpoint's explicit unavailable-state contract.
    const totalSaved = null;
    const savedGrowth = null;
    const avgResponseTimeHours =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : null;
    const responseTimeImprovement = null;

    logger.info('Platform statistics fetched', {
      service: 'stats',
      activeContractors,
      completedJobs,
      totalSaved,
      avgResponseTimeHours,
    });

    return NextResponse.json(
      {
        activeContractors,
        activeContractorsGrowth: contractorsGrowth,
        completedJobs,
        completedJobsGrowth: jobsGrowth,
      totalSaved,
      totalSavedGrowth: savedGrowth,
      avgResponseTimeHours:
        avgResponseTimeHours === null
          ? null
          : parseFloat(avgResponseTimeHours.toFixed(1)),
        responseTimeImprovement,
      },
      {
        headers: {
          'Cache-Control':
            'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
        },
      }
    );
  }
);

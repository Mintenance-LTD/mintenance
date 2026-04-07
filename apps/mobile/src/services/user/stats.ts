import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { ContractorStats, DatabaseTodaysJobRow, ScheduledJob } from './types';

export async function getContractorStats(
  contractorId: string
): Promise<ContractorStats> {
  try {
    // Use shared query from @mintenance/data-access for consistent computation
    // (same logic as web API — eliminates mobile vs server computation divergence)
    const { fetchContractorStats } = await import('@mintenance/data-access');
    const stats = await fetchContractorStats(supabase, contractorId);

    // Estimate response time from rating (until real message tracking)
    const responseTime =
      stats.avgRating >= 4.5
        ? '< 1h'
        : stats.avgRating >= 4.0
          ? '< 2h'
          : '< 4h';

    // Map today's scheduled jobs to the mobile format
    const scheduledJobs: ScheduledJob[] = (
      stats.todaysAppointments as DatabaseTodaysJobRow[]
    ).map((job) => ({
      time: new Date(job.scheduled_start_date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      client:
        `${job.homeowner?.first_name || ''} ${job.homeowner?.last_name || ''}`.trim() ||
        'Client',
      location: job.location,
      type: job.title,
      jobId: job.id,
    }));

    return {
      activeJobs: stats.activeJobs,
      monthlyEarnings: Math.round(stats.monthlyEarnings),
      rating: stats.avgRating,
      completedJobs: stats.completedJobs,
      totalJobs: stats.activeJobs + stats.completedJobs,
      totalJobsCompleted: stats.completedJobs,
      responseTime,
      successRate: stats.successRate,
      todaysAppointments: scheduledJobs.length,
      nextAppointment: scheduledJobs[0],
      todaysJobs: scheduledJobs,
    };
  } catch (error) {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    logger.error('Error fetching contractor stats:', errorInstance);
    // Return default values on error
    return {
      activeJobs: 0,
      monthlyEarnings: 0,
      rating: 0,
      completedJobs: 0,
      totalJobs: 0,
      totalJobsCompleted: 0,
      responseTime: '< 2h',
      successRate: 0,
      todaysAppointments: 0,
      todaysJobs: [],
    };
  }
}

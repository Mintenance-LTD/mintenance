import { serverSupabase } from '@/lib/api/supabaseServer';
import type { JobForRisk } from './types';

/**
 * Calculate rule-based no-show risk (fallback when memory unavailable)
 */
export async function calculateRuleBasedNoShowRisk(contractorId: string): Promise<{
  probability: number;
  reasoning: string;
}> {
  const { data: contractorJobs, error } = await serverSupabase
    .from('jobs')
    .select('id, status, scheduled_start_date')
    .eq('contractor_id', contractorId)
    .in('status', ['assigned', 'in_progress', 'completed', 'cancelled']);

  if (error || !contractorJobs || contractorJobs.length === 0) {
    return {
      probability: 40,
      reasoning: 'New contractor - no history available',
    };
  }

  const pastNoShows = contractorJobs.filter((job) => {
    if (job.status === 'cancelled' && job.scheduled_start_date) {
      const scheduledDate = new Date(job.scheduled_start_date);
      const now = new Date();
      return scheduledDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000;
    }
    return false;
  }).length;

  const noShowRate = (pastNoShows / contractorJobs.length) * 100;
  let probability = 0;

  if (noShowRate > 30) {
    probability = 75;
  } else if (noShowRate > 15) {
    probability = 50;
  } else if (noShowRate > 5) {
    probability = 30;
  }

  return {
    probability,
    reasoning: `Contractor has ${noShowRate.toFixed(1)}% no-show rate`,
  };
}

/**
 * Calculate rule-based dispute risk (fallback when memory unavailable)
 */
export async function calculateRuleBasedDisputeRisk(job: JobForRisk): Promise<{
  riskScore: number;
  factors: string[];
}> {
  let riskScore = 0;
  const factors: string[] = [];

  if (job.budget && job.budget > 1000) {
    riskScore += 20;
    factors.push('High-value job (>£1000)');
  }

  if (job.contractor_id) {
    const { data: contractorJobs } = await serverSupabase
      .from('jobs')
      .select('id, status')
      .eq('contractor_id', job.contractor_id)
      .eq('status', 'completed');

    if (contractorJobs && contractorJobs.length < 5) {
      riskScore += 15;
      factors.push('Inexperienced contractor (<5 completed jobs)');
    }
  }

  const { data: homeownerJobs } = await serverSupabase
    .from('jobs')
    .select('id')
    .eq('homeowner_id', job.homeowner_id)
    .eq('status', 'completed');

  if (!homeownerJobs || homeownerJobs.length === 0) {
    riskScore += 10;
    factors.push('New homeowner (no completed jobs)');
  }

  return { riskScore, factors };
}

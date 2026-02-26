/**
 * Agent Processor Service
 *
 * Encapsulates the batch agent-processing logic that runs on a cron schedule.
 * Executes three stages:
 *   1. JobStatusAgent   - automated status transitions for eligible jobs
 *   2. PredictiveAgent  - risk analysis on assigned jobs
 *   3. SchedulingAgent  - weather-based rescheduling for outdoor jobs
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobStatusAgent } from './JobStatusAgent';
import { PredictiveAgent } from './PredictiveAgent';
import { SchedulingAgent } from './SchedulingAgent';

// ── Types ────────────────────────────────────────────────────────────

interface AgentRunSummary {
  agent: string;
  processed: number;
  errors: number;
}

interface ProcessingCycleResult {
  processed: number;
  errors: number;
  agentResults: AgentRunSummary[];
}

// ── Constants ────────────────────────────────────────────────────────

const SERVICE_NAME = 'agent-processor';
const PREDICTIVE_JOB_LIMIT = 50;
const WEATHER_JOB_LIMIT = 20;

const OUTDOOR_CATEGORIES = [
  'roofing', 'gardening', 'landscaping', 'outdoor',
  'exterior', 'painting', 'fencing',
] as const;

// ── Service ──────────────────────────────────────────────────────────

export class AgentProcessorService {
  /**
   * Run a full processing cycle across all agents.
   */
  static async runProcessingCycle(): Promise<ProcessingCycleResult> {
    const results: ProcessingCycleResult = {
      processed: 0,
      errors: 0,
      agentResults: [],
    };

    await this.processJobStatus(results);
    await this.processPredictiveRisk(results);
    await this.processWeatherRescheduling(results);

    return results;
  }

  private static async processJobStatus(results: ProcessingCycleResult): Promise<void> {
    try {
      const statusResults = await JobStatusAgent.processEligibleJobs();
      const successCount = statusResults.filter((r) => r.success).length;
      const errorCount = statusResults.filter((r) => !r.success).length;

      results.agentResults.push({ agent: 'job-status', processed: successCount, errors: errorCount });
      results.processed += statusResults.length;
      results.errors += errorCount;
    } catch (error) {
      logger.error('Error in job status agent processing', error, { service: SERVICE_NAME });
      results.errors++;
    }
  }

  private static async processPredictiveRisk(results: ProcessingCycleResult): Promise<void> {
    try {
      const { data: assignedJobs } = await serverSupabase
        .from('jobs')
        .select('id')
        .eq('status', 'assigned')
        .limit(PREDICTIVE_JOB_LIMIT);

      if (!assignedJobs || assignedJobs.length === 0) return;

      let processed = 0;
      let errors = 0;

      await Promise.allSettled(
        assignedJobs.map((job) =>
          PredictiveAgent.analyzeJob(job.id)
            .then(() => { processed++; })
            .catch((error) => {
              logger.error('Error analyzing job risk', error, { service: SERVICE_NAME, jobId: job.id });
              errors++;
            })
        )
      );

      results.agentResults.push({ agent: 'predictive', processed, errors });
      results.processed += processed;
      results.errors += errors;
    } catch (error) {
      logger.error('Error in predictive agent processing', error, { service: SERVICE_NAME });
      results.errors++;
    }
  }

  private static async processWeatherRescheduling(results: ProcessingCycleResult): Promise<void> {
    try {
      const { data: candidateJobs } = await serverSupabase
        .from('jobs')
        .select('id, category, location')
        .eq('status', 'assigned')
        .not('scheduled_start_date', 'is', null)
        .not('location', 'is', null)
        .limit(WEATHER_JOB_LIMIT);

      if (!candidateJobs || candidateJobs.length === 0) return;

      const outdoorJobs = candidateJobs.filter(
        (job) =>
          job.category &&
          OUTDOOR_CATEGORIES.some((cat) =>
            job.category?.toLowerCase().includes(cat.toLowerCase())
          )
      );

      if (outdoorJobs.length === 0) return;

      let processed = 0;
      let errors = 0;

      await Promise.allSettled(
        outdoorJobs.map((job) =>
          SchedulingAgent.evaluateWeatherReschedule(job.id)
            .then((result) => { if (result) processed++; })
            .catch((error) => {
              logger.error('Error evaluating weather reschedule', error, { service: SERVICE_NAME, jobId: job.id });
              errors++;
            })
        )
      );

      results.agentResults.push({ agent: 'scheduling', processed, errors });
      results.processed += processed;
      results.errors += errors;
    } catch (error) {
      logger.error('Error in scheduling agent processing', error, { service: SERVICE_NAME });
      results.errors++;
    }
  }
}

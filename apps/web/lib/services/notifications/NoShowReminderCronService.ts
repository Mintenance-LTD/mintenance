/**
 * No-Show Reminder Cron Service
 *
 * Extracted from cron/no-show-reminders route handler.
 * Orchestrates: no-show detection, pre-start reminders,
 * predictive risk analysis, and weather-based rescheduling.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NoShowReminderService } from './NoShowReminderService';
import { PredictiveAgent } from '@/lib/services/agents/PredictiveAgent';
import { SchedulingAgent } from '@/lib/services/agents/SchedulingAgent';

const PREDICTIVE_JOB_LIMIT = 50;
const WEATHER_JOB_LIMIT = 20;
const OUTDOOR_CATEGORIES = [
  'roofing',
  'gardening',
  'landscaping',
  'outdoor',
  'exterior',
  'painting',
  'fencing',
];

interface ScheduledCheckResults {
  noShowChecks: boolean;
  preStartReminders: boolean;
  predictiveAnalysis: { jobsAnalyzed: number };
  weatherRescheduling: { jobsChecked: number };
  errors: number;
}

export class NoShowReminderCronService {
  /**
   * Run all scheduled no-show, reminder, risk, and weather checks.
   */
  static async runScheduledChecks(): Promise<ScheduledCheckResults> {
    const results: ScheduledCheckResults = {
      noShowChecks: false,
      preStartReminders: false,
      predictiveAnalysis: { jobsAnalyzed: 0 },
      weatherRescheduling: { jobsChecked: 0 },
      errors: 0,
    };

    // 1. Check for no-shows
    try {
      await NoShowReminderService.checkAndSendReminders();
      results.noShowChecks = true;
    } catch (error) {
      logger.error('No-show check failed', error, {
        service: 'NoShowReminderCronService',
      });
      results.errors++;
    }

    // 2. Send pre-start reminders
    try {
      await NoShowReminderService.sendPreStartReminders();
      results.preStartReminders = true;
    } catch (error) {
      logger.error('Pre-start reminders failed', error, {
        service: 'NoShowReminderCronService',
      });
      results.errors++;
    }

    // 3. Run predictive risk analysis on assigned jobs
    try {
      const predictiveCount = await this.runPredictiveAnalysis();
      results.predictiveAnalysis.jobsAnalyzed = predictiveCount;
    } catch (error) {
      logger.error('Predictive analysis failed', error, {
        service: 'NoShowReminderCronService',
      });
      results.errors++;
    }

    // 4. Check weather-based auto-rescheduling on outdoor jobs
    try {
      const weatherCount = await this.runWeatherRescheduling();
      results.weatherRescheduling.jobsChecked = weatherCount;
    } catch (error) {
      logger.error('Weather rescheduling failed', error, {
        service: 'NoShowReminderCronService',
      });
      results.errors++;
    }

    return results;
  }

  /**
   * Analyze assigned jobs for predictive risk assessment.
   */
  private static async runPredictiveAnalysis(): Promise<number> {
    const { data: assignedJobs } = await serverSupabase
      .from('jobs')
      .select('id')
      .eq('status', 'assigned');

    if (!assignedJobs || assignedJobs.length === 0) return 0;

    const jobsToAnalyze = assignedJobs.slice(0, PREDICTIVE_JOB_LIMIT);

    await Promise.allSettled(
      jobsToAnalyze.map((job) =>
        PredictiveAgent.analyzeJob(job.id).catch((error) => {
          logger.error('Error analyzing job risk', error, {
            service: 'NoShowReminderCronService',
            jobId: job.id,
          });
        })
      )
    );

    return jobsToAnalyze.length;
  }

  /**
   * Check weather conditions for outdoor assigned jobs
   * and auto-reschedule if needed.
   */
  private static async runWeatherRescheduling(): Promise<number> {
    const { data: outdoorJobs } = await serverSupabase
      .from('jobs')
      .select('id, category, location')
      .eq('status', 'assigned')
      .not('scheduled_start_date', 'is', null)
      .not('location', 'is', null);

    if (!outdoorJobs || outdoorJobs.length === 0) return 0;

    // Filter to outdoor job categories
    const actualOutdoorJobs = outdoorJobs.filter(
      (job) =>
        job.category &&
        OUTDOOR_CATEGORIES.some((cat) =>
          job.category?.toLowerCase().includes(cat.toLowerCase())
        )
    );

    const jobsToCheck = actualOutdoorJobs.slice(0, WEATHER_JOB_LIMIT);

    await Promise.allSettled(
      jobsToCheck.map((job) =>
        SchedulingAgent.evaluateWeatherReschedule(job.id).catch((error) => {
          logger.error('Error evaluating weather reschedule', error, {
            service: 'NoShowReminderCronService',
            jobId: job.id,
          });
        })
      )
    );

    return jobsToCheck.length;
  }
}

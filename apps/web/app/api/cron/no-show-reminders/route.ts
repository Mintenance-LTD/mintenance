import { NextRequest, NextResponse } from 'next/server';
import { NoShowReminderService } from '@/lib/services/notifications/NoShowReminderService';
import { PredictiveAgent } from '@/lib/services/agents/PredictiveAgent';
import { SchedulingAgent } from '@/lib/services/agents/SchedulingAgent';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

// This endpoint should be called by a cron job (e.g., Vercel Cron, Supabase Cron)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for no-shows
    await NoShowReminderService.checkAndSendReminders();

    // Send pre-start reminders
    await NoShowReminderService.sendPreStartReminders();

    // Run predictive risk analysis on assigned jobs
    const { data: assignedJobs } = await serverSupabase
      .from('jobs')
      .select('id')
      .eq('status', 'assigned');

    if (assignedJobs && assignedJobs.length > 0) {
      // Analyze up to 50 jobs per run to avoid timeout
      const jobsToAnalyze = assignedJobs.slice(0, 50);
      await Promise.allSettled(
        jobsToAnalyze.map((job) =>
          PredictiveAgent.analyzeJob(job.id).catch((error) => {
            logger.error('Error analyzing job risk', error, {
              service: 'cron',
              jobId: job.id,
            });
          })
        )
      );
    }

    // Check for weather-based auto-rescheduling on outdoor jobs
    const { data: outdoorJobs } = await serverSupabase
      .from('jobs')
      .select('id, category, location')
      .eq('status', 'assigned')
      .not('scheduled_start_date', 'is', null)
      .not('location', 'is', null);

    if (outdoorJobs && outdoorJobs.length > 0) {
      // Filter to outdoor job categories
      const outdoorCategories = ['roofing', 'gardening', 'landscaping', 'outdoor', 'exterior', 'painting', 'fencing'];
      const actualOutdoorJobs = outdoorJobs.filter(job => 
        job.category && outdoorCategories.some(cat => job.category?.toLowerCase().includes(cat.toLowerCase()))
      );

      // Check weather for up to 20 outdoor jobs per run
      await Promise.allSettled(
        actualOutdoorJobs.slice(0, 20).map((job) =>
          SchedulingAgent.evaluateWeatherReschedule(job.id).catch((error) => {
            logger.error('Error evaluating weather reschedule', error, {
              service: 'cron',
              jobId: job.id,
            });
          })
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in no-show reminders cron', error, {
      service: 'cron',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


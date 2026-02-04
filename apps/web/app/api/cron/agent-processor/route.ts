import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { AgentOrchestrator } from '@/lib/services/agents/AgentOrchestrator';
import { JobStatusAgent } from '@/lib/services/agents/JobStatusAgent';
import { PredictiveAgent } from '@/lib/services/agents/PredictiveAgent';
import { SchedulingAgent } from '@/lib/services/agents/SchedulingAgent';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCronAuth } from '@/lib/cron-auth';
import { rateLimiter } from '@/lib/rate-limiter';
import { handleAPIError } from '@/lib/errors/api-error';

/**
 * Main cron endpoint for agent processing
 * Runs every 15 minutes to process jobs through all relevant agents
 */
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 1
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(1),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Verify cron secret
    const authError = requireCronAuth(request);
    if (authError) {
      return authError;
    }

    logger.info('Starting agent processing cycle', {
      service: 'agent-processor',
    });

    const results = {
      processed: 0,
      errors: 0,
      agentResults: [] as Array<{ agent: string; processed: number; errors: number }>,
    };

    // Process job status automation
    try {
      const statusResults = await JobStatusAgent.processEligibleJobs();
      results.agentResults.push({
        agent: 'job-status',
        processed: statusResults.filter((r) => r.success).length,
        errors: statusResults.filter((r) => !r.success).length,
      });
      results.processed += statusResults.length;
      results.errors += statusResults.filter((r) => !r.success).length;
    } catch (error) {
      logger.error('Error in job status agent processing', error, {
        service: 'agent-processor',
      });
      results.errors++;
    }

    // Process predictive risk analysis on assigned jobs
    try {
      const { data: assignedJobs } = await serverSupabase
        .from('jobs')
        .select('id')
        .eq('status', 'assigned')
        .limit(50); // Limit to 50 jobs per run

      if (assignedJobs && assignedJobs.length > 0) {
        let processed = 0;
        let errors = 0;

        await Promise.allSettled(
          assignedJobs.map((job) =>
            PredictiveAgent.analyzeJob(job.id)
              .then(() => {
                processed++;
              })
              .catch((error) => {
                logger.error('Error analyzing job risk', error, {
                  service: 'agent-processor',
                  jobId: job.id,
                });
                errors++;
              })
          )
        );

        results.agentResults.push({
          agent: 'predictive',
          processed,
          errors,
        });
        results.processed += processed;
        results.errors += errors;
      }
    } catch (error) {
      logger.error('Error in predictive agent processing', error, {
        service: 'agent-processor',
      });
      results.errors++;
    }

    // Process weather-based rescheduling
    try {
      const { data: outdoorJobs } = await serverSupabase
        .from('jobs')
        .select('id, category, location')
        .eq('status', 'assigned')
        .not('scheduled_start_date', 'is', null)
        .not('location', 'is', null)
        .limit(20); // Limit to 20 jobs per run

      if (outdoorJobs && outdoorJobs.length > 0) {
        const outdoorCategories = [
          'roofing',
          'gardening',
          'landscaping',
          'outdoor',
          'exterior',
          'painting',
          'fencing',
        ];
        const actualOutdoorJobs = outdoorJobs.filter(
          (job) =>
            job.category &&
            outdoorCategories.some((cat) =>
              job.category?.toLowerCase().includes(cat.toLowerCase())
            )
        );

        let processed = 0;
        let errors = 0;

        await Promise.allSettled(
          actualOutdoorJobs.map((job) =>
            SchedulingAgent.evaluateWeatherReschedule(job.id)
              .then((result) => {
                if (result) processed++;
              })
              .catch((error) => {
                logger.error('Error evaluating weather reschedule', error, {
                  service: 'agent-processor',
                  jobId: job.id,
                });
                errors++;
              })
          )
        );

        results.agentResults.push({
          agent: 'scheduling',
          processed,
          errors,
        });
        results.processed += processed;
        results.errors += errors;
      }
    } catch (error) {
      logger.error('Error in scheduling agent processing', error, {
        service: 'agent-processor',
      });
      results.errors++;
    }

    logger.info('Agent processing cycle completed', {
      service: 'agent-processor',
      results,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('Error in agent processor cron', error, {
      service: 'agent-processor',
    });
    // SECURITY: Use centralized error handler (sanitizes all errors)
    return handleAPIError(error);
  }
}


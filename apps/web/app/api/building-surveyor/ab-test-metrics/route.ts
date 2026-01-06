/**
 * A/B Test Metrics API
 * 
 * GET /api/building-surveyor/ab-test-metrics
 * Returns current metrics for the A/B testing system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { ABTestMonitoringService } from '@/lib/services/building-surveyor/ABTestMonitoringService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

/**
 * GET /api/building-surveyor/ab-test-metrics
 * 
 * Returns A/B test metrics including:
 * - Automation rate
 * - SFN rate
 * - Coverage violations
 * - Decision times
 * - Model statistics
 */
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!AB_TEST_EXPERIMENT_ID) {
      throw new BadRequestError('A/B testing not configured');
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeViolations = searchParams.get('include_violations') === 'true';
    const includePerStratum = searchParams.get('include_per_stratum') === 'true';
    const includePerArm = searchParams.get('include_per_arm') === 'true';
    const includeTrends = searchParams.get('include_trends') === 'true';
    const days = parseInt(searchParams.get('days') || '7', 10);

    // Get metrics
    const metrics = await ABTestMonitoringService.getMetrics(AB_TEST_EXPERIMENT_ID);

    // Get coverage violations if requested
    let coverageViolations = null;
    if (includeViolations) {
      const violationCheck = await ABTestMonitoringService.checkCoverageViolations();
      coverageViolations = violationCheck.violations;
    }

    // Get per-stratum coverage if requested
    let perStratumCoverage = null;
    if (includePerStratum) {
      perStratumCoverage = await ABTestMonitoringService.getPerStratumCoverage(AB_TEST_EXPERIMENT_ID);
    }

    // Get per-arm SFN rates if requested
    let perArmSFNRates = null;
    if (includePerArm) {
      perArmSFNRates = await ABTestMonitoringService.getPerArmSFNRates(AB_TEST_EXPERIMENT_ID);
    }

    // Get automation rate over time
    const automationRateOverTime = await ABTestMonitoringService.getAutomationRateOverTime(
      AB_TEST_EXPERIMENT_ID,
      days
    );

    // Calculate trends if requested
    let trends = null;
    if (includeTrends && automationRateOverTime.length > 0) {
      const movingAverages = ABTestMonitoringService.calculateMovingAverages(
        automationRateOverTime,
        7 // 7-day moving average
      );
      const anomalies = ABTestMonitoringService.detectAnomalies(automationRateOverTime, 20);
      
      trends = {
        movingAverages7Day: movingAverages,
        movingAverages30Day: ABTestMonitoringService.calculateMovingAverages(automationRateOverTime, 30),
        anomalies,
      };
    }

    logger.info('A/B test metrics retrieved', {
      service: 'ab-test-metrics-api',
      userId: user.id,
      automationRate: metrics.automationRate,
    });

    return NextResponse.json({
      metrics,
      coverageViolations,
      perStratumCoverage,
      perArmSFNRates,
      automationRateOverTime,
      trends,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleAPIError(error);
  }
}


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
    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!AB_TEST_EXPERIMENT_ID) {
      return NextResponse.json(
        { error: 'A/B testing not configured' },
        { status: 503 }
      );
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
    logger.error('Error retrieving A/B test metrics', error, {
      service: 'ab-test-metrics-api',
    });

    const errorMessage = error instanceof Error ? error.message : undefined;

    return NextResponse.json(
      {
        error: 'Failed to retrieve metrics',
        ...(errorMessage && { message: errorMessage }),
      },
      { status: 500 }
    );
  }
}


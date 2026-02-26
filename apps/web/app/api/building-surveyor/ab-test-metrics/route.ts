/**
 * A/B Test Metrics API
 * GET /api/building-surveyor/ab-test-metrics
 */

import { NextResponse } from 'next/server';
import { ABTestMonitoringService } from '@/lib/services/building-surveyor/ABTestMonitoringService';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

export const GET = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user }) => {
  if (!AB_TEST_EXPERIMENT_ID) throw new BadRequestError('A/B testing not configured');

  const searchParams = request.nextUrl.searchParams;
  const includeViolations = searchParams.get('include_violations') === 'true';
  const includePerStratum = searchParams.get('include_per_stratum') === 'true';
  const includePerArm = searchParams.get('include_per_arm') === 'true';
  const includeTrends = searchParams.get('include_trends') === 'true';
  const days = parseInt(searchParams.get('days') || '7', 10);

  const metrics = await ABTestMonitoringService.getMetrics(AB_TEST_EXPERIMENT_ID);

  let coverageViolations = null;
  if (includeViolations) {
    const violationCheck = await ABTestMonitoringService.checkCoverageViolations();
    coverageViolations = violationCheck.violations;
  }

  let perStratumCoverage = null;
  if (includePerStratum) perStratumCoverage = await ABTestMonitoringService.getPerStratumCoverage(AB_TEST_EXPERIMENT_ID);

  let perArmSFNRates = null;
  if (includePerArm) perArmSFNRates = await ABTestMonitoringService.getPerArmSFNRates(AB_TEST_EXPERIMENT_ID);

  const automationRateOverTime = await ABTestMonitoringService.getAutomationRateOverTime(AB_TEST_EXPERIMENT_ID, days);

  let trends = null;
  if (includeTrends && automationRateOverTime.length > 0) {
    const movingAverages = ABTestMonitoringService.calculateMovingAverages(automationRateOverTime, 7);
    const anomalies = ABTestMonitoringService.detectAnomalies(automationRateOverTime, 20);
    trends = { movingAverages7Day: movingAverages, movingAverages30Day: ABTestMonitoringService.calculateMovingAverages(automationRateOverTime, 30), anomalies };
  }

  logger.info('A/B test metrics retrieved', { service: 'ab-test-metrics-api', userId: user.id, automationRate: metrics.automationRate });

  return NextResponse.json({ metrics, coverageViolations, perStratumCoverage, perArmSFNRates, automationRateOverTime, trends, timestamp: new Date().toISOString() });
});

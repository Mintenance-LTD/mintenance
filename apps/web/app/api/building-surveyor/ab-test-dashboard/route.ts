/**
 * A/B Test Dashboard API
 * 
 * GET /api/building-surveyor/ab-test-dashboard
 * Returns comprehensive dashboard data for the A/B testing system
 * 
 * Includes:
 * - Time series for automation rate, SFN rate, coverage
 * - Stratum-level breakdowns
 * - Critic model performance metrics
 * - Recent alerts
 * - Seed safe set growth over time
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { ABTestMonitoringService } from '@/lib/services/building-surveyor/ABTestMonitoringService';
import { ABTestAlertingService } from '@/lib/services/building-surveyor/ABTestAlertingService';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

/**
 * GET /api/building-surveyor/ab-test-dashboard
 * 
 * Returns comprehensive dashboard data
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
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Get all metrics
    const metrics = await ABTestMonitoringService.getMetrics(AB_TEST_EXPERIMENT_ID);

    // Get time series data
    const automationRateOverTime = await ABTestMonitoringService.getAutomationRateOverTime(
      AB_TEST_EXPERIMENT_ID,
      days
    );

    // Get SFN rate over time
    const sfnRateOverTime = await getSFNRateOverTime(AB_TEST_EXPERIMENT_ID, days);

    // Get coverage rate over time
    const coverageRateOverTime = await getCoverageRateOverTime(AB_TEST_EXPERIMENT_ID, days);

    // Get stratum-level breakdowns
    const perStratumCoverage = await ABTestMonitoringService.getPerStratumCoverage(AB_TEST_EXPERIMENT_ID);

    // Get per-arm metrics
    const perArmSFNRates = await ABTestMonitoringService.getPerArmSFNRates(AB_TEST_EXPERIMENT_ID);

    // Get critic model performance
    const criticModelPerformance = await getCriticModelPerformance(AB_TEST_EXPERIMENT_ID);

    // Get recent alerts
    const alertCheck = await ABTestAlertingService.checkAlerts(AB_TEST_EXPERIMENT_ID);

    // Get seed safe set growth
    const seedSafeSetGrowth = await getSeedSafeSetGrowth(AB_TEST_EXPERIMENT_ID, days);

    // Calculate trends
    const trends = {
      automationRate: {
        movingAverage7Day: ABTestMonitoringService.calculateMovingAverages(automationRateOverTime, 7),
        movingAverage30Day: ABTestMonitoringService.calculateMovingAverages(automationRateOverTime, 30),
        anomalies: ABTestMonitoringService.detectAnomalies(automationRateOverTime, 20),
      },
      sfnRate: {
        movingAverage7Day: ABTestMonitoringService.calculateMovingAverages(sfnRateOverTime, 7),
        anomalies: ABTestMonitoringService.detectAnomalies(sfnRateOverTime, 0.1), // 0.1% threshold for SFN
      },
      coverageRate: {
        movingAverage7Day: ABTestMonitoringService.calculateMovingAverages(coverageRateOverTime, 7),
        anomalies: ABTestMonitoringService.detectAnomalies(coverageRateOverTime, 5), // 5% threshold for coverage
      },
    };

    logger.info('A/B test dashboard data retrieved', {
      service: 'ab-test-dashboard-api',
      userId: user.id,
    });

    return NextResponse.json({
      summary: {
        automationRate: metrics.automationRate,
        escalationRate: metrics.escalationRate,
        sfnRate: metrics.sfnRate,
        coverageRate: metrics.coverageRate,
        seedSafeSetSize: metrics.seedSafeSetSize,
        criticModelObservations: metrics.criticModelObservations,
      },
      timeSeries: {
        automationRate: automationRateOverTime,
        sfnRate: sfnRateOverTime,
        coverageRate: coverageRateOverTime,
      },
      breakdowns: {
        perStratumCoverage,
        perArmSFNRates,
      },
      criticModel: criticModelPerformance,
      alerts: {
        hasAlerts: alertCheck.hasAlerts,
        critical: alertCheck.criticalCount,
        warning: alertCheck.warningCount,
        info: alertCheck.infoCount,
        recent: alertCheck.alerts.slice(0, 10), // Last 10 alerts
      },
      seedSafeSet: {
        currentSize: metrics.seedSafeSetSize,
        growth: seedSafeSetGrowth,
      },
      trends,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error('Error retrieving A/B test dashboard data', error, {
      service: 'ab-test-dashboard-api',
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to retrieve dashboard data',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Get SFN rate over time
 */
async function getSFNRateOverTime(
  experimentId: string,
  days: number
): Promise<Array<{ date: string; rate: number }>> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: outcomes } = await serverSupabase
      .from('ab_outcomes')
      .select('sfn, validated_at')
      .eq('experiment_id', experimentId)
      .gte('validated_at', startDate.toISOString())
      .order('validated_at', { ascending: true });

    if (!outcomes || outcomes.length === 0) {
      return [];
    }

    const dailyGroups = new Map<string, { total: number; sfn: number }>();

    for (const outcome of outcomes) {
      const date = new Date(outcome.validated_at).toISOString().split('T')[0];
      const group = dailyGroups.get(date) || { total: 0, sfn: 0 };
      group.total += 1;
      if (outcome.sfn === true) {
        group.sfn += 1;
      }
      dailyGroups.set(date, group);
    }

    return Array.from(dailyGroups.entries())
      .map(([date, group]) => ({
        date,
        rate: group.total > 0 ? (group.sfn / group.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    logger.error('Failed to get SFN rate over time', { error });
    return [];
  }
}

/**
 * Get coverage rate over time
 */
async function getCoverageRateOverTime(
  experimentId: string,
  days: number
): Promise<Array<{ date: string; rate: number }>> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: outcomes } = await serverSupabase
      .from('ab_outcomes')
      .select('true_class, cp_prediction_set, validated_at')
      .eq('experiment_id', experimentId)
      .gte('validated_at', startDate.toISOString())
      .order('validated_at', { ascending: true });

    if (!outcomes || outcomes.length === 0) {
      return [];
    }

    const dailyGroups = new Map<string, { total: number; covered: number }>();

    for (const outcome of outcomes) {
      const date = new Date(outcome.validated_at).toISOString().split('T')[0];
      const group = dailyGroups.get(date) || { total: 0, covered: 0 };
      group.total += 1;
      const predictionSet = outcome.cp_prediction_set || [];
      if (predictionSet.includes(outcome.true_class)) {
        group.covered += 1;
      }
      dailyGroups.set(date, group);
    }

    return Array.from(dailyGroups.entries())
      .map(([date, group]) => ({
        date,
        rate: group.total > 0 ? (group.covered / group.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    logger.error('Failed to get coverage rate over time', { error });
    return [];
  }
}

/**
 * Get critic model performance metrics
 */
async function getCriticModelPerformance(experimentId: string): Promise<{
  observations: number;
  lastUpdated: string | null;
  rewardModelNorm: number;
  safetyModelNorm: number;
}> {
  try {
    const { data: criticModel } = await serverSupabase
      .from('ab_critic_models')
      .select('parameters, updated_at')
      .eq('model_type', 'safe_lucb')
      .single();

    if (!criticModel || !criticModel.parameters) {
      return {
        observations: 0,
        lastUpdated: null,
        rewardModelNorm: 0,
        safetyModelNorm: 0,
      };
    }

    interface CriticModelParameters {
      theta?: number[];
      phi?: number[];
      n?: number;
      [key: string]: unknown;
    }

    const params = criticModel.parameters as CriticModelParameters;
    const theta = Array.isArray(params.theta) ? params.theta : [];
    const phi = Array.isArray(params.phi) ? params.phi : [];

    // Calculate L2 norms
    const rewardModelNorm = Math.sqrt(theta.reduce((sum: number, val: number) => sum + val * val, 0));
    const safetyModelNorm = Math.sqrt(phi.reduce((sum: number, val: number) => sum + val * val, 0));

    const observations = typeof params.n === 'number' ? params.n : 0;

    return {
      observations,
      lastUpdated: criticModel.updated_at || null,
      rewardModelNorm,
      safetyModelNorm,
    };
  } catch (error) {
    logger.error('Failed to get critic model performance', { error });
    return {
      observations: 0,
      lastUpdated: null,
      rewardModelNorm: 0,
      safetyModelNorm: 0,
    };
  }
}

/**
 * Get seed safe set growth over time
 */
async function getSeedSafeSetGrowth(
  experimentId: string,
  days: number
): Promise<Array<{ date: string; size: number }>> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: validations } = await serverSupabase
      .from('ab_historical_validations')
      .select('property_type, property_age_bin, region, sfn, validated_at')
      .gte('validated_at', startDate.toISOString())
      .order('validated_at', { ascending: true })
      .limit(50000);

    if (!validations || validations.length === 0) {
      return [];
    }

    // Group by date and context
    const dailyContextGroups = new Map<string, Map<string, { total: number; sfn: number }>>();

    for (const v of validations) {
      const date = new Date(v.validated_at).toISOString().split('T')[0];
      const contextKey = `${v.property_type}_${v.property_age_bin}_${v.region}`;

      let dateGroups = dailyContextGroups.get(date);
      if (!dateGroups) {
        dateGroups = new Map();
        dailyContextGroups.set(date, dateGroups);
      }

      const group = dateGroups.get(contextKey) || { total: 0, sfn: 0 };
      group.total += 1;
      if (v.sfn === true) {
        group.sfn += 1;
      }
      dateGroups.set(contextKey, group);
    }

    // Calculate cumulative seed safe set size
    const cumulativeContexts = new Map<string, { total: number; sfn: number }>();
    const growth: Array<{ date: string; size: number }> = [];

    const sortedDates = Array.from(dailyContextGroups.keys()).sort();

    for (const date of sortedDates) {
      const dateGroups = dailyContextGroups.get(date)!;

      // Update cumulative counts
      for (const [contextKey, group] of dateGroups.entries()) {
        const cumulative = cumulativeContexts.get(contextKey) || { total: 0, sfn: 0 };
        cumulative.total += group.total;
        cumulative.sfn += group.sfn;
        cumulativeContexts.set(contextKey, cumulative);
      }

      // Count safe contexts (n≥1000, SFN=0)
      let safeSetSize = 0;
      for (const [_, cumulative] of cumulativeContexts.entries()) {
        if (cumulative.total >= 1000 && cumulative.sfn === 0) {
          safeSetSize += 1;
        }
      }

      growth.push({ date, size: safeSetSize });
    }

    return growth;
  } catch (error) {
    logger.error('Failed to get seed safe set growth', { error });
    return [];
  }
}


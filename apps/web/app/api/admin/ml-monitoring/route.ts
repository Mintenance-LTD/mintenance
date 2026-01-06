/**
 * ML Monitoring Dashboard API
 *
 * Provides comprehensive monitoring data for the continuous learning pipeline
 * including model performance, feedback metrics, drift detection, and alerts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ContinuousLearningService, getLearningPipelineSummary } from '@/lib/services/building-surveyor/ContinuousLearningService';
import { ModelEvaluationService } from '@/lib/services/building-surveyor/ModelEvaluationService';
import { DriftMonitorService } from '@/lib/services/building-surveyor/DriftMonitorService';
import { getExperimentHealth } from '@/lib/monitoring/experimentHealth';
import { rateLimiter } from '@/lib/rate-limiter';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DashboardData {
  // Overall health
  pipelineHealth: {
    status: 'healthy' | 'warning' | 'critical';
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  };

  // Model metrics
  modelPerformance: {
    currentVersion: string;
    metrics: {
      mAP50: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
    historicalTrend: Array<{
      date: string;
      f1Score: number;
      version: string;
    }>;
    comparisonWithBaseline: {
      improvement: number;
      significantChange: boolean;
    };
  };

  // Feedback metrics
  feedbackMetrics: {
    totalCorrections: number;
    pendingReview: number;
    approvedToday: number;
    rejectedToday: number;
    averageQuality: number;
    correctionRate: number; // Corrections per day
    topContributors: Array<{
      userId: string;
      name: string;
      correctionsCount: number;
    }>;
  };

  // Training metrics
  trainingMetrics: {
    lastTrainingDate: string | null;
    nextScheduledTraining: string | null;
    trainingJobsThisWeek: number;
    successRate: number;
    averageTrainingTime: number; // minutes
    queuedCorrections: number;
  };

  // Drift metrics
  driftMetrics: {
    currentDrift: {
      type: string;
      score: number;
      detected: boolean;
    };
    recentDriftEvents: Array<{
      date: string;
      type: string;
      score: number;
      adjustmentApplied: boolean;
    }>;
    seasonalPattern: {
      expectedDrift: string;
      currentSeason: string;
    };
  };

  // A/B testing metrics
  abTestingMetrics: {
    activeTests: number;
    testsThisMonth: number;
    deploymentSuccessRate: number;
    averageImprovementPerTest: number;
    currentTests: Array<{
      testId: string;
      name: string;
      status: string;
      controlVersion: string;
      treatmentVersion: string;
      progress: number; // 0-100
    }>;
  };

  // System alerts
  alerts: {
    critical: number;
    warning: number;
    info: number;
    recent: Array<{
      id: string;
      type: string;
      severity: string;
      message: string;
      timestamp: string;
      acknowledged: boolean;
    }>;
  };

  // Resource usage
  resourceUsage: {
    storageUsed: number; // GB
    storageLimit: number; // GB
    apiCallsToday: number;
    apiCallsLimit: number;
    estimatedMonthlyCost: number;
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d';
    const includeDetails = searchParams.get('details') === 'true';

    // Fetch dashboard data
    const dashboardData = await compileDashboardData(timeRange, includeDetails);

    return NextResponse.json(dashboardData);

  } catch (error) {
    logger.error('ML monitoring dashboard API error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DATA COMPILATION
// ============================================================================

async function compileDashboardData(
  timeRange: string,
  includeDetails: boolean
): Promise<DashboardData> {
  const supabase = serverSupabase;
  const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID || 'default-experiment';

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  switch (timeRange) {
    case '24h':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }

  // Fetch all data in parallel
  const [
    pipelineStatus,
    pipelineSummary,
    modelMetrics,
    feedbackStats,
    trainingJobs,
    driftEvents,
    abTests,
    systemAlerts,
    experimentHealthData
  ] = await Promise.all([
    ContinuousLearningService.getStatus(),
    getLearningPipelineSummary(),
    getModelPerformanceData(startDate, endDate),
    getFeedbackMetrics(startDate, endDate),
    getTrainingMetrics(startDate, endDate),
    getDriftMetrics(startDate, endDate),
    getABTestingMetrics(startDate, endDate),
    getSystemAlerts(startDate, endDate),
    getExperimentHealth(AB_TEST_EXPERIMENT_ID)
  ]);

  // Compile dashboard data
  const dashboardData: DashboardData = {
    pipelineHealth: {
      status: pipelineSummary.status,
      score: calculateHealthScore(pipelineStatus),
      issues: identifyIssues(pipelineStatus, experimentHealthData),
      recommendations: pipelineSummary.recommendations
    },

    modelPerformance: {
      currentVersion: pipelineStatus.currentModelVersion,
      metrics: pipelineStatus.currentModelMetrics || {
        mAP50: 0,
        precision: 0,
        recall: 0,
        f1Score: 0
      },
      historicalTrend: modelMetrics.historicalTrend,
      comparisonWithBaseline: modelMetrics.comparisonWithBaseline
    },

    feedbackMetrics: {
      totalCorrections: feedbackStats.totalCorrections,
      pendingReview: pipelineStatus.pendingCorrections,
      approvedToday: feedbackStats.approvedToday,
      rejectedToday: feedbackStats.rejectedToday,
      averageQuality: feedbackStats.averageQuality,
      correctionRate: feedbackStats.correctionRate,
      topContributors: includeDetails ? feedbackStats.topContributors : []
    },

    trainingMetrics: {
      lastTrainingDate: pipelineStatus.lastRetrainingDate || null,
      nextScheduledTraining: pipelineStatus.nextScheduledRetraining || null,
      trainingJobsThisWeek: trainingJobs.jobsThisWeek,
      successRate: trainingJobs.successRate,
      averageTrainingTime: trainingJobs.averageTime,
      queuedCorrections: pipelineStatus.approvedCorrections
    },

    driftMetrics: {
      currentDrift: {
        type: pipelineStatus.activeDrift?.type || 'none',
        score: pipelineStatus.activeDrift?.score || 0,
        detected: !!pipelineStatus.activeDrift
      },
      recentDriftEvents: driftEvents.recent,
      seasonalPattern: driftEvents.seasonalPattern
    },

    abTestingMetrics: {
      activeTests: pipelineStatus.activeABTests,
      testsThisMonth: abTests.testsThisMonth,
      deploymentSuccessRate: abTests.successRate,
      averageImprovementPerTest: abTests.averageImprovement,
      currentTests: includeDetails ? abTests.currentTests : []
    },

    alerts: {
      critical: systemAlerts.critical,
      warning: systemAlerts.warning,
      info: systemAlerts.info,
      recent: systemAlerts.recent
    },

    resourceUsage: await getResourceUsage()
  };

  return dashboardData;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getModelPerformanceData(startDate: Date, endDate: Date) {
  const supabase = serverSupabase;

  // Get historical metrics
  const historicalMetrics = await ModelEvaluationService.getHistoricalMetrics('yolo', 30);

  // Format for trend chart
  const historicalTrend = historicalMetrics.map(m => ({
    date: m.evaluation_timestamp,
    f1Score: m.test_metrics.f1_score,
    version: m.model_version
  }));

  // Calculate improvement from baseline
  const baseline = historicalMetrics[historicalMetrics.length - 1];
  const current = historicalMetrics[0];
  const improvement = baseline && current
    ? (current.test_metrics.f1_score - baseline.test_metrics.f1_score) / baseline.test_metrics.f1_score
    : 0;

  return {
    historicalTrend,
    comparisonWithBaseline: {
      improvement,
      significantChange: Math.abs(improvement) > 0.05
    }
  };
}

async function getFeedbackMetrics(startDate: Date, endDate: Date) {
  const supabase = serverSupabase;

  // Get correction statistics
  const { data: corrections } = await supabase
    .from('yolo_corrections')
    .select('id, status, created_at, corrected_by, confidence_score')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const approvedToday = corrections?.filter(c =>
    c.status === 'approved' &&
    new Date(c.created_at) >= today
  ).length || 0;

  const rejectedToday = corrections?.filter(c =>
    c.status === 'rejected' &&
    new Date(c.created_at) >= today
  ).length || 0;

  // Calculate average quality
  const avgQuality = (corrections?.reduce((sum, c) => sum + (c.confidence_score || 0), 0) ?? 0) /
                     (corrections?.length || 1);

  // Calculate correction rate
  const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const correctionRate = (corrections?.length || 0) / daysDiff;

  // Get top contributors
  const contributorMap = new Map<string, number>();
  corrections?.forEach(c => {
    if (c.corrected_by) {
      contributorMap.set(c.corrected_by, (contributorMap.get(c.corrected_by) || 0) + 1);
    }
  });

  const topContributors = Array.from(contributorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => ({
      userId,
      name: 'User ' + userId.substring(0, 8), // Simplified - would fetch actual names
      correctionsCount: count
    }));

  return {
    totalCorrections: corrections?.length || 0,
    approvedToday,
    rejectedToday,
    averageQuality: avgQuality,
    correctionRate,
    topContributors
  };
}

async function getTrainingMetrics(startDate: Date, endDate: Date) {
  const supabase = serverSupabase;

  const { data: jobs } = await supabase
    .from('yolo_retraining_jobs')
    .select('id, status, created_at, completed_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const jobsThisWeek = jobs?.filter(j => new Date(j.created_at) >= weekAgo).length || 0;
  const successfulJobs = jobs?.filter(j => j.status === 'completed').length || 0;
  const successRate = jobs?.length ? (successfulJobs / jobs.length) : 0;

  // Calculate average training time
  const trainingTimes = jobs
    ?.filter(j => j.completed_at)
    .map(j => {
      const start = new Date(j.created_at).getTime();
      const end = new Date(j.completed_at).getTime();
      return (end - start) / (1000 * 60); // Convert to minutes
    }) || [];

  const averageTime = trainingTimes.length
    ? trainingTimes.reduce((a, b) => a + b, 0) / trainingTimes.length
    : 0;

  return {
    jobsThisWeek,
    successRate,
    averageTime
  };
}

async function getDriftMetrics(startDate: Date, endDate: Date) {
  const supabase = serverSupabase;

  const { data: events } = await supabase
    .from('drift_events')
    .select('*')
    .gte('detected_at', startDate.toISOString())
    .lte('detected_at', endDate.toISOString())
    .order('detected_at', { ascending: false });

  const recent = (events || []).slice(0, 10).map(e => ({
    date: e.detected_at,
    type: e.drift_type,
    score: e.drift_score,
    adjustmentApplied: e.weight_adjustment_applied
  }));

  // Determine seasonal pattern
  const month = new Date().getMonth();
  const currentSeason = month >= 2 && month <= 4 ? 'spring' :
                       month >= 5 && month <= 7 ? 'summer' :
                       month >= 8 && month <= 10 ? 'fall' : 'winter';

  const expectedDrift = currentSeason === 'winter' || currentSeason === 'fall'
    ? 'moisture/stains'
    : 'structural/cracks';

  return {
    recent,
    seasonalPattern: {
      expectedDrift,
      currentSeason
    }
  };
}

async function getABTestingMetrics(startDate: Date, endDate: Date) {
  const supabase = serverSupabase;

  const { data: tests } = await supabase
    .from('model_ab_tests')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const testsThisMonth = tests?.filter(t => new Date(t.created_at) >= monthAgo).length || 0;
  const successfulTests = tests?.filter(t => t.status === 'completed').length || 0;
  const successRate = tests?.length ? (successfulTests / tests.length) : 0;

  // Get current tests
  const currentTests = (tests || [])
    .filter(t => t.status === 'running')
    .map(t => {
      const config = t.config_jsonb as any;
      return {
        testId: t.test_id,
        name: config.name || 'Unnamed Test',
        status: t.status,
        controlVersion: config.control_model?.version || 'unknown',
        treatmentVersion: config.treatment_model?.version || 'unknown',
        progress: calculateTestProgress(t)
      };
    });

  // Calculate average improvement (simplified)
  const averageImprovement = 0.03; // 3% average (would calculate from actual data)

  return {
    testsThisMonth,
    successRate,
    averageImprovement,
    currentTests
  };
}

async function getSystemAlerts(startDate: Date, endDate: Date) {
  const supabase = serverSupabase;

  const { data: alerts } = await supabase
    .from('system_alerts')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  const critical = alerts?.filter(a => a.severity === 'critical' && !a.resolved).length || 0;
  const warning = alerts?.filter(a => a.severity === 'warning' && !a.resolved).length || 0;
  const info = alerts?.filter(a => a.severity === 'info' && !a.resolved).length || 0;

  const recent = (alerts || []).slice(0, 20).map(a => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    message: a.message,
    timestamp: a.created_at,
    acknowledged: a.acknowledged
  }));

  return {
    critical,
    warning,
    info,
    recent
  };
}

async function getResourceUsage() {
  // Simplified resource usage calculation
  // In production, would fetch from actual usage tracking
  return {
    storageUsed: 12.5, // GB
    storageLimit: 100, // GB
    apiCallsToday: 4523,
    apiCallsLimit: 10000,
    estimatedMonthlyCost: 89.50
  };
}

function calculateHealthScore(status: unknown): number {
  let score = 100;

  // Deduct points for issues
  if (status.pendingCorrections > 500) score -= 10;
  if (status.pendingCorrections > 1000) score -= 10;
  if (status.activeDrift?.score > 0.3) score -= 15;
  if (!status.currentModelMetrics || status.currentModelMetrics.f1Score < 0.7) score -= 20;

  // Check recency of training
  if (status.lastRetrainingDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(status.lastRetrainingDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 14) score -= 15;
    if (daysSince > 30) score -= 15;
  } else {
    score -= 30;
  }

  return Math.max(0, Math.min(100, score));
}

function identifyIssues(status: unknown, experimentHealthData: unknown): string[] {
  const issues: string[] = [];

  if (status.pendingCorrections > 500) {
    issues.push('High number of pending corrections');
  }

  if (status.activeDrift?.score > 0.3) {
    issues.push('Significant distribution drift detected');
  }

  if (!status.currentModelMetrics || status.currentModelMetrics.f1Score < 0.7) {
    issues.push('Model performance below threshold');
  }

  if (experimentHealthData.automationRate < 0.7) {
    issues.push('Low automation rate in experiments');
  }

  return issues;
}

function calculateTestProgress(test: unknown): number {
  // Simplified progress calculation
  // In production, would calculate based on sample size and duration
  if (test.status === 'completed') return 100;
  if (test.status === 'draft') return 0;

  const startDate = new Date(test.started_at || test.created_at);
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const maxDays = test.config_jsonb?.maximum_duration_days || 7;

  return Math.min(100, (daysPassed / maxDays) * 100);
}

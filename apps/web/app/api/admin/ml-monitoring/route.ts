/**
 * ML Monitoring Dashboard API
 *
 * Provides comprehensive monitoring data for the continuous learning pipeline
 * including model performance, feedback metrics, drift detection, and alerts.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ContinuousLearningService, getLearningPipelineSummary } from '@/lib/services/building-surveyor/ContinuousLearningService';
import { ModelEvaluationService } from '@/lib/services/building-surveyor/ModelEvaluationService';
import { getExperimentHealth } from '@/lib/monitoring/experimentHealth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ModelStatus {
  pendingCorrections: number;
  activeDrift?: { score: number; type?: string };
  currentModelMetrics?: { f1Score: number; mAP50?: number; precision?: number; recall?: number };
  lastRetrainingDate?: string;
  currentModelVersion: string;
  nextScheduledRetraining?: string;
  approvedCorrections: number;
  activeABTests: number;
}

interface ExperimentHealthData {
  automationRate: number;
}

interface ABTest {
  status: string;
  started_at?: string;
  created_at: string;
  test_id: string;
  config_jsonb?: {
    name?: string;
    maximum_duration_days?: number;
    control_model?: { version?: string };
    treatment_model?: { version?: string };
  };
}

interface DashboardData {
  pipelineHealth: { status: 'healthy' | 'warning' | 'critical'; score: number; issues: string[]; recommendations: string[] };
  modelPerformance: { currentVersion: string; metrics: { mAP50: number; precision: number; recall: number; f1Score: number }; historicalTrend: Array<{ date: string; f1Score: number; version: string }>; comparisonWithBaseline: { improvement: number; significantChange: boolean } };
  feedbackMetrics: { totalCorrections: number; pendingReview: number; approvedToday: number; rejectedToday: number; averageQuality: number; correctionRate: number; topContributors: Array<{ userId: string; name: string; correctionsCount: number }> };
  trainingMetrics: { lastTrainingDate: string | null; nextScheduledTraining: string | null; trainingJobsThisWeek: number; successRate: number; averageTrainingTime: number; queuedCorrections: number };
  driftMetrics: { currentDrift: { type: string; score: number; detected: boolean }; recentDriftEvents: Array<{ date: string; type: string; score: number; adjustmentApplied: boolean }>; seasonalPattern: { expectedDrift: string; currentSeason: string } };
  abTestingMetrics: { activeTests: number; testsThisMonth: number; deploymentSuccessRate: number; averageImprovementPerTest: number; currentTests: Array<{ testId: string; name: string; status: string; controlVersion: string; treatmentVersion: string; progress: number }> };
  alerts: { critical: number; warning: number; info: number; recent: Array<{ id: string; type: string; severity: string; message: string; timestamp: string; acknowledged: boolean }> };
  resourceUsage: { storageUsed: number; storageLimit: number; apiCallsToday: number; apiCallsLimit: number; estimatedMonthlyCost: number };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const timeRange = request.nextUrl.searchParams.get('timeRange') || '7d';
    const includeDetails = request.nextUrl.searchParams.get('details') === 'true';

    const dashboardData = await compileDashboardData(timeRange, includeDetails);
    return NextResponse.json(dashboardData);
  }
);

// ============================================================================
// DATA COMPILATION
// ============================================================================

async function compileDashboardData(timeRange: string, includeDetails: boolean): Promise<DashboardData> {
  const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID || 'default-experiment';

  const endDate = new Date();
  const startDate = new Date();
  switch (timeRange) {
    case '24h': startDate.setDate(startDate.getDate() - 1); break;
    case '7d': startDate.setDate(startDate.getDate() - 7); break;
    case '30d': startDate.setDate(startDate.getDate() - 30); break;
    default: startDate.setDate(startDate.getDate() - 7);
  }

  const [pipelineStatus, pipelineSummary, modelMetrics, feedbackStats, trainingJobs, driftEvents, abTests, systemAlerts, experimentHealthData] = await Promise.all([
    ContinuousLearningService.getStatus(),
    getLearningPipelineSummary(),
    getModelPerformanceData(startDate),
    getFeedbackMetrics(startDate, endDate),
    getTrainingMetrics(startDate, endDate),
    getDriftMetrics(startDate, endDate),
    getABTestingMetrics(startDate, endDate),
    getSystemAlerts(startDate, endDate),
    getExperimentHealth(AB_TEST_EXPERIMENT_ID),
  ]);

  return {
    pipelineHealth: { status: pipelineSummary.status, score: calculateHealthScore(pipelineStatus), issues: identifyIssues(pipelineStatus, experimentHealthData), recommendations: pipelineSummary.recommendations },
    modelPerformance: { currentVersion: pipelineStatus.currentModelVersion, metrics: pipelineStatus.currentModelMetrics || { mAP50: 0, precision: 0, recall: 0, f1Score: 0 }, historicalTrend: modelMetrics.historicalTrend, comparisonWithBaseline: modelMetrics.comparisonWithBaseline },
    feedbackMetrics: { totalCorrections: feedbackStats.totalCorrections, pendingReview: pipelineStatus.pendingCorrections, approvedToday: feedbackStats.approvedToday, rejectedToday: feedbackStats.rejectedToday, averageQuality: feedbackStats.averageQuality, correctionRate: feedbackStats.correctionRate, topContributors: includeDetails ? feedbackStats.topContributors : [] },
    trainingMetrics: { lastTrainingDate: pipelineStatus.lastRetrainingDate || null, nextScheduledTraining: pipelineStatus.nextScheduledRetraining || null, trainingJobsThisWeek: trainingJobs.jobsThisWeek, successRate: trainingJobs.successRate, averageTrainingTime: trainingJobs.averageTime, queuedCorrections: pipelineStatus.approvedCorrections },
    driftMetrics: { currentDrift: { type: pipelineStatus.activeDrift?.type || 'none', score: pipelineStatus.activeDrift?.score || 0, detected: !!pipelineStatus.activeDrift }, recentDriftEvents: driftEvents.recent, seasonalPattern: driftEvents.seasonalPattern },
    abTestingMetrics: { activeTests: pipelineStatus.activeABTests, testsThisMonth: abTests.testsThisMonth, deploymentSuccessRate: abTests.successRate, averageImprovementPerTest: abTests.averageImprovement, currentTests: includeDetails ? abTests.currentTests : [] },
    alerts: systemAlerts,
    resourceUsage: await getResourceUsage(),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getModelPerformanceData(_startDate: Date) {
  const historicalMetrics = await ModelEvaluationService.getHistoricalMetrics('yolo', 30);
  const historicalTrend = historicalMetrics.map(m => ({ date: m.evaluation_timestamp, f1Score: m.test_metrics.f1_score, version: m.model_version }));
  const baseline = historicalMetrics[historicalMetrics.length - 1];
  const current = historicalMetrics[0];
  const improvement = baseline && current ? (current.test_metrics.f1_score - baseline.test_metrics.f1_score) / baseline.test_metrics.f1_score : 0;
  return { historicalTrend, comparisonWithBaseline: { improvement, significantChange: Math.abs(improvement) > 0.05 } };
}

async function getFeedbackMetrics(startDate: Date, endDate: Date) {
  const { data: corrections } = await serverSupabase
    .from('yolo_corrections')
    .select('id, status, created_at, corrected_by, confidence_score')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const approvedToday = corrections?.filter(c => c.status === 'approved' && new Date(c.created_at) >= today).length || 0;
  const rejectedToday = corrections?.filter(c => c.status === 'rejected' && new Date(c.created_at) >= today).length || 0;
  const avgQuality = (corrections?.reduce((sum, c) => sum + (c.confidence_score || 0), 0) ?? 0) / (corrections?.length || 1);
  const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const correctionRate = (corrections?.length || 0) / daysDiff;

  const contributorMap = new Map<string, number>();
  corrections?.forEach(c => { if (c.corrected_by) contributorMap.set(c.corrected_by, (contributorMap.get(c.corrected_by) || 0) + 1); });
  const topContributors = Array.from(contributorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([userId, count]) => ({ userId, name: 'User ' + userId.substring(0, 8), correctionsCount: count }));

  return { totalCorrections: corrections?.length || 0, approvedToday, rejectedToday, averageQuality: avgQuality, correctionRate, topContributors };
}

async function getTrainingMetrics(startDate: Date, endDate: Date) {
  const { data: jobs } = await serverSupabase
    .from('yolo_retraining_jobs')
    .select('id, status, created_at, completed_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const jobsThisWeek = jobs?.filter(j => new Date(j.created_at) >= weekAgo).length || 0;
  const successfulJobs = jobs?.filter(j => j.status === 'completed').length || 0;
  const successRate = jobs?.length ? (successfulJobs / jobs.length) : 0;
  const trainingTimes = jobs?.filter(j => j.completed_at).map(j => (new Date(j.completed_at).getTime() - new Date(j.created_at).getTime()) / (1000 * 60)) || [];
  const averageTime = trainingTimes.length ? trainingTimes.reduce((a, b) => a + b, 0) / trainingTimes.length : 0;
  return { jobsThisWeek, successRate, averageTime };
}

async function getDriftMetrics(startDate: Date, endDate: Date) {
  const { data: events } = await serverSupabase
    .from('drift_events')
    .select('*')
    .gte('detected_at', startDate.toISOString())
    .lte('detected_at', endDate.toISOString())
    .order('detected_at', { ascending: false });

  const recent = (events || []).slice(0, 10).map(e => ({ date: e.detected_at, type: e.drift_type, score: e.drift_score, adjustmentApplied: e.weight_adjustment_applied }));
  const month = new Date().getMonth();
  const currentSeason = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'fall' : 'winter';
  const expectedDrift = currentSeason === 'winter' || currentSeason === 'fall' ? 'moisture/stains' : 'structural/cracks';
  return { recent, seasonalPattern: { expectedDrift, currentSeason } };
}

async function getABTestingMetrics(startDate: Date, endDate: Date) {
  const { data: tests } = await serverSupabase
    .from('model_ab_tests')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const testsThisMonth = tests?.filter(t => new Date(t.created_at) >= monthAgo).length || 0;
  const successfulTests = tests?.filter(t => t.status === 'completed').length || 0;
  const successRate = tests?.length ? (successfulTests / tests.length) : 0;

  const currentTests = (tests || []).filter(t => t.status === 'running').map((t: ABTest) => {
    const config = t.config_jsonb;
    return { testId: t.test_id, name: config?.name || 'Unnamed Test', status: t.status, controlVersion: config?.control_model?.version || 'unknown', treatmentVersion: config?.treatment_model?.version || 'unknown', progress: calculateTestProgress(t) };
  });

  return { testsThisMonth, successRate, averageImprovement: 0.03, currentTests };
}

async function getSystemAlerts(startDate: Date, endDate: Date) {
  const { data: alerts } = await serverSupabase
    .from('system_alerts')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  return {
    critical: alerts?.filter(a => a.severity === 'critical' && !a.resolved).length || 0,
    warning: alerts?.filter(a => a.severity === 'warning' && !a.resolved).length || 0,
    info: alerts?.filter(a => a.severity === 'info' && !a.resolved).length || 0,
    recent: (alerts || []).slice(0, 20).map(a => ({ id: a.id, type: a.type, severity: a.severity, message: a.message, timestamp: a.created_at, acknowledged: a.acknowledged })),
  };
}

async function getResourceUsage() {
  return { storageUsed: 12.5, storageLimit: 100, apiCallsToday: 4523, apiCallsLimit: 10000, estimatedMonthlyCost: 89.50 };
}

function calculateHealthScore(status: ModelStatus): number {
  let score = 100;
  if (status.pendingCorrections > 500) score -= 10;
  if (status.pendingCorrections > 1000) score -= 10;
  if ((status.activeDrift?.score ?? 0) > 0.3) score -= 15;
  if (!status.currentModelMetrics || status.currentModelMetrics.f1Score < 0.7) score -= 20;
  if (status.lastRetrainingDate) {
    const daysSince = Math.floor((Date.now() - new Date(status.lastRetrainingDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 14) score -= 15;
    if (daysSince > 30) score -= 15;
  } else { score -= 30; }
  return Math.max(0, Math.min(100, score));
}

function identifyIssues(status: ModelStatus, experimentHealthData: ExperimentHealthData): string[] {
  const issues: string[] = [];
  if (status.pendingCorrections > 500) issues.push('High number of pending corrections');
  if (status.activeDrift && status.activeDrift.score > 0.3) issues.push('Significant distribution drift detected');
  if (!status.currentModelMetrics || status.currentModelMetrics.f1Score < 0.7) issues.push('Model performance below threshold');
  if (experimentHealthData.automationRate < 0.7) issues.push('Low automation rate in experiments');
  return issues;
}

function calculateTestProgress(test: ABTest): number {
  if (test.status === 'completed') return 100;
  if (test.status === 'draft') return 0;
  const startDate = new Date(test.started_at || test.created_at);
  const daysPassed = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const maxDays = test.config_jsonb?.maximum_duration_days || 7;
  return Math.min(100, (daysPassed / maxDays) * 100);
}

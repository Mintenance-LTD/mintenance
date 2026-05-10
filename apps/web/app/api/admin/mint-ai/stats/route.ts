import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { RATE_LIMIT_TIERS } from '@/lib/api/rate-limit-tiers';
import { serverSupabase } from '@/lib/api/supabaseServer';

export const dynamic = 'force-dynamic';

// Audit P2 (2026-05-10): added explicit STANDARD rate limit. Was relying
// on the wrapper's 30/min default; making the tier explicit keeps this
// route consistent with the rest of the admin surface.
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: RATE_LIMIT_TIERS.STANDARD },
  async () => {
    const supabase = serverSupabase;

    // Run all queries in parallel
    const [
      shadowRes,
      bufferRes,
      jobsRes,
      calibrationRes,
      assessmentStatsRes,
      routingRes,
    ] = await Promise.all([
      // Shadow comparisons stats
      supabase
        .from('vlm_shadow_comparisons')
        .select(
          'id, damage_category, overall_agreement, safety_recall, student_parse_success, latency_ms, cost_usd, created_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .limit(500),

      // Training buffer stats
      supabase
        .from('vlm_training_buffer')
        .select(
          'id, damage_category, priority_score, surprise_score, teacher_quality, human_verified, used_in_training, created_at',
          { count: 'exact' }
        ),

      // Training jobs
      supabase
        .from('knowledge_distillation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),

      // Student calibration
      supabase
        .from('vlm_student_calibration')
        .select('*')
        .order('last_updated', { ascending: false }),

      // Assessment stats (canonical types + severity)
      supabase
        .from('building_assessments')
        .select(
          'damage_type_canonical, severity, validation_status, recommended_trades, confidence',
          { count: 'exact' }
        ),

      // Routing decisions
      supabase
        .from('vlm_routing_decisions')
        .select(
          'decision, category, student_accuracy, safety_recall, created_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    // Process shadow stats
    const shadows = shadowRes.data ?? [];
    const shadowStats = {
      total: shadowRes.count ?? shadows.length,
      avgAgreement:
        shadows.length > 0
          ? shadows.reduce((s, r) => s + (r.overall_agreement ?? 0), 0) /
            shadows.length
          : 0,
      avgSafetyRecall:
        shadows.length > 0
          ? shadows.reduce((s, r) => s + (r.safety_recall ?? 0), 0) /
            shadows.length
          : 0,
      parseSuccessRate:
        shadows.length > 0
          ? shadows.filter((r) => r.student_parse_success).length /
            shadows.length
          : 0,
      avgLatencyMs:
        shadows.length > 0
          ? shadows.reduce((s, r) => s + (r.latency_ms ?? 0), 0) /
            shadows.length
          : 0,
      totalCostUsd: shadows.reduce((s, r) => s + (r.cost_usd ?? 0), 0),
      byCategory: Object.entries(
        shadows.reduce<
          Record<string, { count: number; agreement: number; recall: number }>
        >((acc, r) => {
          const cat = r.damage_category ?? 'unknown';
          if (!acc[cat]) acc[cat] = { count: 0, agreement: 0, recall: 0 };
          acc[cat].count++;
          acc[cat].agreement += r.overall_agreement ?? 0;
          acc[cat].recall += r.safety_recall ?? 0;
          return acc;
        }, {})
      )
        .map(([category, stats]) => ({
          category,
          count: stats.count,
          avgAgreement: stats.agreement / stats.count,
          avgSafetyRecall: stats.recall / stats.count,
        }))
        .sort((a, b) => b.count - a.count),
      recent: shadows.slice(0, 10).map((s) => ({
        category: s.damage_category,
        agreement: s.overall_agreement,
        safetyRecall: s.safety_recall,
        parseSuccess: s.student_parse_success,
        latencyMs: s.latency_ms,
        createdAt: s.created_at,
      })),
    };

    // Process buffer stats
    const buffer = bufferRes.data ?? [];
    const bufferStats = {
      total: bufferRes.count ?? buffer.length,
      unused: buffer.filter((b) => !b.used_in_training).length,
      humanVerified: buffer.filter((b) => b.human_verified).length,
      avgPriority:
        buffer.length > 0
          ? buffer.reduce((s, b) => s + (b.priority_score ?? 0), 0) /
            buffer.length
          : 0,
      avgSurprise:
        buffer.length > 0
          ? buffer.reduce((s, b) => s + (b.surprise_score ?? 0), 0) /
            buffer.length
          : 0,
      byQuality: {
        high: buffer.filter((b) => b.teacher_quality === 'high').length,
        medium: buffer.filter((b) => b.teacher_quality === 'medium').length,
        low: buffer.filter((b) => b.teacher_quality === 'low').length,
        uncertain: buffer.filter((b) => b.teacher_quality === 'uncertain')
          .length,
      },
      byCategory: Object.entries(
        buffer.reduce<Record<string, number>>((acc, b) => {
          const cat = b.damage_category ?? 'unknown';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      trainingThreshold: 200,
      readyForTraining: buffer.filter((b) => !b.used_in_training).length >= 200,
    };

    // Process training jobs
    const jobs = jobsRes.data ?? [];
    const trainingStats = {
      totalJobs: jobs.length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      running: jobs.filter((j) => j.status === 'running').length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      jobs: jobs.map((j) => ({
        id: j.id,
        status: j.status,
        modelVersion: j.model_version,
        baseModel: j.base_model_version,
        samplesCount: j.training_samples_count,
        trainLoss: j.metrics_jsonb?.finalTrainLoss ?? null,
        evalLoss: j.metrics_jsonb?.finalEvalLoss ?? null,
        durationSeconds:
          j.metrics_jsonb?.durationSeconds ?? j.duration_seconds ?? null,
        framework: j.metrics_jsonb?.trainingFramework ?? 'custom',
        triggeredBy: j.triggered_by,
        createdAt: j.created_at,
        completedAt: j.completed_at,
        error: j.error_message,
      })),
    };

    // Process calibration
    const calibration = calibrationRes.data ?? [];
    const calibrationStats = {
      totalCategories: calibration.length,
      categories: calibration.map((c) => ({
        category: c.category,
        totalPredictions: c.total_predictions,
        accuracy: c.accuracy,
        safetyRecall: c.safety_recall,
        emaAccuracy: c.ema_accuracy,
        emaSafetyRecall: c.ema_safety_recall,
        lastUpdated: c.last_updated,
      })),
      avgAccuracy:
        calibration.length > 0
          ? calibration.reduce((s, c) => s + (c.accuracy ?? 0), 0) /
            calibration.length
          : 0,
      avgSafetyRecall:
        calibration.length > 0
          ? calibration.reduce((s, c) => s + (c.safety_recall ?? 0), 0) /
            calibration.length
          : 0,
    };

    // Process assessment stats (canonical types)
    const assessments = assessmentStatsRes.data ?? [];
    const assessmentStats = {
      total: assessmentStatsRes.count ?? assessments.length,
      byCanonicalType: Object.entries(
        assessments.reduce<Record<string, number>>((acc, a) => {
          const type = a.damage_type_canonical ?? 'unmapped';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      bySeverity: Object.entries(
        assessments.reduce<Record<string, number>>((acc, a) => {
          acc[a.severity] = (acc[a.severity] || 0) + 1;
          return acc;
        }, {})
      ).map(([severity, count]) => ({ severity, count })),
      byValidation: Object.entries(
        assessments.reduce<Record<string, number>>((acc, a) => {
          acc[a.validation_status] = (acc[a.validation_status] || 0) + 1;
          return acc;
        }, {})
      ).map(([status, count]) => ({ status, count })),
      avgConfidence:
        assessments.length > 0
          ? assessments.reduce((s, a) => s + (a.confidence ?? 0), 0) /
            assessments.length
          : 0,
    };

    // Process routing decisions
    const routing = routingRes.data ?? [];
    const routingStats = {
      total: routingRes.count ?? routing.length,
      byDecision: Object.entries(
        routing.reduce<Record<string, number>>((acc, r) => {
          acc[r.decision] = (acc[r.decision] || 0) + 1;
          return acc;
        }, {})
      ).map(([decision, count]) => ({ decision, count })),
      avgStudentAccuracy:
        routing.length > 0
          ? routing.reduce((s, r) => s + (r.student_accuracy ?? 0), 0) /
            routing.length
          : 0,
      avgSafetyRecall:
        routing.length > 0
          ? routing.reduce((s, r) => s + (r.safety_recall ?? 0), 0) /
            routing.length
          : 0,
    };

    return NextResponse.json({
      shadow: shadowStats,
      buffer: bufferStats,
      training: trainingStats,
      calibration: calibrationStats,
      assessments: assessmentStats,
      routing: routingStats,
      timestamp: new Date().toISOString(),
    });
  }
);

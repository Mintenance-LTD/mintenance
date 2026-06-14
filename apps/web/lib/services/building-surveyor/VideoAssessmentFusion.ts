/**
 * Video Assessment Fusion
 *
 * Bridges the async SAM2 video microservice back into the canonical
 * `building_assessments` row. When a video job completes, its aggregated
 * temporal assessment is mapped onto the assessment's first-class columns
 * (severity / urgency / confidence / damage_type) and the full SAM2 payload
 * is stored under `assessment_data.sam2_aggregated` so every client (web +
 * any device) reads the same fused result — not a copy trapped in one
 * phone's local storage.
 *
 * Two entry points share one idempotent core:
 *   - fuseAssessmentVideo(id)  — driven by the status-poll request path so
 *                                results land in near real-time.
 *   - runBatch()               — cron backstop for rows whose client
 *                                stopped polling (app closed mid-job).
 *
 * Concurrency: the completing UPDATE is a compare-and-swap on
 * validation_status='processing'; only the winner records pseudo-labels,
 * so overlapping polls can't double-write training data.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  SAM2VideoService,
  type SAM2AggregatedAssessment,
  type SAM2Trajectory,
} from './SAM2VideoService';
import { KnowledgeDistillationService } from './KnowledgeDistillationService';

type WebSeverity = 'early' | 'developing' | 'significant' | 'dangerous';
type WebUrgency = 'monitor' | 'needs_attention' | 'urgent' | 'emergency';

export interface FuseResult {
  changed: boolean;
  status: 'processing' | 'completed' | 'failed' | 'unavailable';
}

export class VideoAssessmentFusion {
  /** Rows older than this still 'processing' with a job id are abandoned. */
  private static readonly STALE_MINUTES = 30;

  // ── SAM2 → building_assessments vocab mapping ─────────────────────────
  // SAM2 overall_severity ∈ {none, early, midway, full}; the column CHECK
  // allows {early, developing, significant, dangerous}. Map order-preserving
  // (SAM2 'early' literally means early-stage damage → column 'early').

  private static mapSeverity(overall: string): WebSeverity {
    switch (overall) {
      case 'full':
        return 'dangerous';
      case 'midway':
        return 'significant';
      case 'early':
        return 'early';
      default:
        return 'early'; // 'none' / unknown → lowest allowed
    }
  }

  private static mapUrgency(
    severity: WebSeverity,
    highPriority: string[]
  ): WebUrgency {
    if (severity === 'dangerous') {
      return highPriority.includes('structural damage')
        ? 'emergency'
        : 'urgent';
    }
    if (severity === 'significant') return 'needs_attention';
    return 'monitor';
  }

  /** Weighted-average confidence (0..1) → 0..100, with a level fallback. */
  private static mapConfidence(agg: SAM2AggregatedAssessment): number {
    const items = Object.values(agg.damage_summary ?? {});
    let weighted = 0;
    let weight = 0;
    for (const item of items) {
      const w = item.instance_count || 0;
      weighted += w * (item.average_confidence || 0);
      weight += w;
    }
    if (weight > 0) {
      return Math.round(Math.min(100, Math.max(0, (weighted / weight) * 100)));
    }
    const byLevel: Record<string, number> = { high: 90, medium: 70, low: 40 };
    return byLevel[agg.confidence_level] ?? 0;
  }

  /** Dominant damage type by instance count, tie-broken by confidence. */
  private static dominantDamageType(agg: SAM2AggregatedAssessment): string {
    const items = Object.values(agg.damage_summary ?? {}).filter(
      (i) => (i.instance_count || 0) > 0
    );
    if (agg.total_unique_damages === 0 || items.length === 0) {
      return 'no_significant_damage';
    }
    items.sort(
      (a, b) =>
        b.instance_count - a.instance_count ||
        b.max_confidence - a.max_confidence
    );
    return (items[0]?.damage_type ?? 'general_damage').slice(0, 120);
  }

  /** SAM2 trajectory bbox is {x,y,width,height}; distillation wants {x1,y1,x2,y2}. */
  private static toDistillationTrajectories(trajectories: SAM2Trajectory[]) {
    return trajectories.map((t) => ({
      track_id: t.track_id,
      damage_type: t.damage_type,
      average_confidence: t.average_confidence,
      max_confidence: t.max_confidence,
      consistency_score: t.consistency_score,
      is_consistent: t.is_consistent,
      tracking_points: (t.tracking_points ?? []).map((p) => ({
        frame_number: p.frame_number,
        bounding_box: {
          x1: p.bounding_box.x,
          y1: p.bounding_box.y,
          x2: p.bounding_box.x + p.bounding_box.width,
          y2: p.bounding_box.y + p.bounding_box.height,
        },
        confidence: p.confidence,
      })),
    }));
  }

  /**
   * Poll SAM2 for one assessment's video job and fuse the result if ready.
   * Idempotent + concurrency-safe. Returns the resulting status and whether
   * this call changed the row.
   */
  static async fuseAssessmentVideo(assessmentId: string): Promise<FuseResult> {
    const { data: row } = await serverSupabase
      .from('building_assessments')
      .select('id, validation_status, assessment_data')
      .eq('id', assessmentId)
      .maybeSingle();

    if (!row) return { changed: false, status: 'failed' };

    const data = (row.assessment_data as Record<string, unknown> | null) ?? {};
    const processingId = data.sam2_processing_id as string | undefined;
    const alreadyFused = data.sam2_fused === true;

    if (
      row.validation_status !== 'processing' ||
      !processingId ||
      alreadyFused
    ) {
      return {
        changed: false,
        status: (row.validation_status as FuseResult['status']) ?? 'processing',
      };
    }

    const status = await SAM2VideoService.getStatus(processingId);

    // Transport failure / not configured: leave as-is unless the job has
    // been stuck past the stale window, in which case fail it so it stops
    // spinning forever.
    if (!status) {
      const startedAt = Date.parse((data.sam2_started_at as string) || '');
      const ageMin = Number.isFinite(startedAt)
        ? (Date.now() - startedAt) / 60000
        : 0;
      if (ageMin > this.STALE_MINUTES) {
        return this.markFailed(assessmentId, data, 'sam2_unreachable');
      }
      return { changed: false, status: 'processing' };
    }

    if (status.status === 'failed') {
      return this.markFailed(
        assessmentId,
        data,
        status.error || 'sam2_processing_failed'
      );
    }

    if (
      status.status !== 'completed' ||
      !status.result?.aggregated_assessment
    ) {
      return { changed: false, status: 'processing' };
    }

    return this.fuseCompleted(assessmentId, data, status.result);
  }

  private static async fuseCompleted(
    assessmentId: string,
    existingData: Record<string, unknown>,
    result: NonNullable<
      Awaited<ReturnType<typeof SAM2VideoService.getStatus>>
    >['result']
  ): Promise<FuseResult> {
    const agg = result!.aggregated_assessment as SAM2AggregatedAssessment;
    const trajectories = result!.trajectories ?? [];

    const severity = this.mapSeverity(agg.overall_severity);
    const urgency = this.mapUrgency(severity, agg.high_priority_damages ?? []);
    const confidence = this.mapConfidence(agg);
    const damageType = this.dominantDamageType(agg);

    const mergedData = {
      ...existingData,
      sam2_fused: true,
      sam2_completed_at: new Date().toISOString(),
      sam2_aggregated: agg,
    };

    // Compare-and-swap on validation_status so concurrent pollers don't both
    // record pseudo-labels. Only the row we actually transition is "won".
    const { data: won, error } = await serverSupabase
      .from('building_assessments')
      .update({
        validation_status: 'completed',
        severity,
        urgency,
        confidence,
        damage_type: damageType,
        assessment_data: mergedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)
      .eq('validation_status', 'processing')
      .select('id');

    if (error) {
      logger.error('Video fusion update failed', error, {
        service: 'video-assessment-fusion',
        assessmentId,
      });
      return { changed: false, status: 'processing' };
    }

    const wonRace = (won?.length ?? 0) > 0;
    if (wonRace && trajectories.length > 0) {
      try {
        await KnowledgeDistillationService.recordSAM2TemporalData(
          assessmentId,
          {
            trajectories: this.toDistillationTrajectories(trajectories),
          }
        );
      } catch (err) {
        // Pseudo-label capture is best-effort; never undo a completed fuse.
        logger.warn('SAM2 pseudo-label capture failed', {
          service: 'video-assessment-fusion',
          assessmentId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('Video assessment fused from SAM2', {
      service: 'video-assessment-fusion',
      assessmentId,
      severity,
      urgency,
      confidence,
      damageType,
      uniqueDamages: agg.total_unique_damages,
      wonRace,
    });

    return { changed: wonRace, status: 'completed' };
  }

  private static async markFailed(
    assessmentId: string,
    existingData: Record<string, unknown>,
    reason: string
  ): Promise<FuseResult> {
    const { data: won } = await serverSupabase
      .from('building_assessments')
      .update({
        validation_status: 'failed',
        assessment_data: {
          ...existingData,
          sam2_fused: true,
          sam2_error: reason,
          sam2_completed_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)
      .eq('validation_status', 'processing')
      .select('id');

    logger.warn('Video assessment marked failed', {
      service: 'video-assessment-fusion',
      assessmentId,
      reason,
    });
    return { changed: (won?.length ?? 0) > 0, status: 'failed' };
  }

  /**
   * Cron backstop: poll every in-flight video job and fuse the ready ones.
   */
  static async runBatch(limit = 25): Promise<{
    checked: number;
    completed: number;
    failed: number;
    pending: number;
  }> {
    if (!SAM2VideoService.isConfigured()) {
      return { checked: 0, completed: 0, failed: 0, pending: 0 };
    }

    const { data: rows } = await serverSupabase
      .from('building_assessments')
      .select('id, assessment_data')
      .eq('validation_status', 'processing')
      .not('assessment_data->>sam2_processing_id', 'is', null)
      .limit(limit);

    let completed = 0;
    let failed = 0;
    let pending = 0;

    for (const row of rows ?? []) {
      const data =
        (row.assessment_data as Record<string, unknown> | null) ?? {};
      if (data.sam2_fused === true) continue;

      const res = await this.fuseAssessmentVideo(row.id as string);
      if (res.status === 'completed') completed++;
      else if (res.status === 'failed') failed++;
      else pending++;
    }

    return { checked: rows?.length ?? 0, completed, failed, pending };
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/assessments/:id/status
 *
 * Poll assessment processing status. Returns the assessment record
 * including validation_status ('pending' | 'processing' | 'completed' | 'failed')
 * and assessment_data (AI analysis results when complete).
 *
 * Mobile client: VideoProcessingStatusScreen polls this every 2s.
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user, params }) => {
    const assessmentId = params.id as string;

    const { data, error } = await serverSupabase
      .from('building_assessments')
      .select(
        'id, user_id, property_id, domain, damage_type, severity, confidence, ' +
          'safety_score, compliance_score, insurance_risk_score, urgency, ' +
          'assessment_data, validation_status, video_url, created_at, updated_at'
      )
      .eq('id', assessmentId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Assessment not found');
    }

    const assessment = data as unknown as Record<string, unknown>;

    // Only allow owner or admin to view
    if (assessment.user_id !== user.id && user.role !== 'admin') {
      throw new NotFoundError('Assessment not found');
    }

    // Fetch associated images
    const { data: images } = await serverSupabase
      .from('assessment_images')
      .select('id, image_url, image_index')
      .eq('assessment_id', assessmentId)
      .order('image_index', { ascending: true });

    const status = assessment.validation_status as string;
    const isComplete = status === 'completed' || status === 'validated';
    const isFailed = status === 'failed';

    return NextResponse.json({
      id: assessment.id,
      status,
      isComplete,
      isFailed,
      assessment: isComplete
        ? {
            domain: assessment.domain,
            damageType: assessment.damage_type,
            severity: assessment.severity,
            confidence: assessment.confidence,
            safetyScore: assessment.safety_score,
            complianceScore: assessment.compliance_score,
            insuranceRiskScore: assessment.insurance_risk_score,
            urgency: assessment.urgency,
            data: assessment.assessment_data,
          }
        : null,
      videoUrl: assessment.video_url,
      images: images || [],
      createdAt: assessment.created_at,
      updatedAt: assessment.updated_at,
    });
  }
);

/**
 * PATCH /api/assessments/:id/status
 *
 * 2026-04-30 audit P0-1 follow-up: replaces the direct
 * `supabase.from('building_assessments').update(...)` calls that lived
 * in the mobile `triggerAIAnalysis.ts` flow. The Mint AI background
 * trigger persists analysis output back to the assessment row through
 * this endpoint so RLS + ownership checks live in one place.
 *
 * Owner-only — admins must use `/api/admin/building-assessments`.
 */
const patchSchema = z
  .object({
    validation_status: z
      .enum([
        'pending',
        'processing',
        'needs_review',
        'completed',
        'validated',
        'failed',
        'ai_analysis_failed',
        'ai_analysis_skipped_no_auth',
      ])
      .optional(),
    damage_type: z.string().max(120).optional(),
    damage_type_canonical: z.string().max(120).optional(),
    severity: z.string().max(60).optional(),
    confidence: z.number().min(0).max(100).optional(),
    urgency: z
      .enum(['monitor', 'needs_attention', 'urgent', 'emergency'])
      .optional(),
    insurance_risk_score: z.number().optional(),
    safety_score: z.number().optional(),
    // Merged into existing assessment_data JSON when present
    assessment_data_patch: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const assessmentId = params.id as string;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Verify ownership BEFORE mutating — RLS enforces this too, but a
    // pre-flight check gives a clean 403 instead of a confusing
    // "0 rows updated" silent no-op.
    const { data: existing } = await serverSupabase
      .from('building_assessments')
      .select('id, user_id, assessment_data')
      .eq('id', assessmentId)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundError('Assessment not found');
    }
    if (existing.user_id !== user.id) {
      throw new ForbiddenError('You do not own this assessment');
    }

    const update: Record<string, unknown> = {};
    const data = parsed.data;
    if (data.validation_status !== undefined)
      update.validation_status = data.validation_status;
    if (data.damage_type !== undefined) update.damage_type = data.damage_type;
    if (data.damage_type_canonical !== undefined)
      update.damage_type_canonical = data.damage_type_canonical;
    if (data.severity !== undefined) update.severity = data.severity;
    if (data.confidence !== undefined) update.confidence = data.confidence;
    if (data.urgency !== undefined) update.urgency = data.urgency;
    if (data.insurance_risk_score !== undefined)
      update.insurance_risk_score = data.insurance_risk_score;
    if (data.safety_score !== undefined)
      update.safety_score = data.safety_score;

    if (data.assessment_data_patch) {
      const existingData =
        (existing.assessment_data as Record<string, unknown> | null) ?? {};
      update.assessment_data = {
        ...existingData,
        ...data.assessment_data_patch,
      };
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    const { error: updateError } = await serverSupabase
      .from('building_assessments')
      .update(update)
      .eq('id', assessmentId)
      .eq('user_id', user.id);

    if (updateError) {
      logger.error('Failed to patch assessment status', updateError, {
        service: 'assessments',
        assessmentId,
      });
      return NextResponse.json(
        { error: 'Failed to update assessment status' },
        { status: 500 }
      );
    }

    logger.info('Assessment status patched', {
      service: 'assessments',
      assessmentId,
      userId: user.id,
      keys: Object.keys(update),
    });

    return NextResponse.json({ success: true, updated: 1 });
  }
);

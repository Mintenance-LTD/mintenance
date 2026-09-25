import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { resignAssessmentUrls } from '@/lib/api/assessment-storage';
import { checkAICostBudget } from '@/lib/ai/cost-budget';
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { getAssessmentResult } from '@/lib/services/building-surveyor/assessment-result';
import { canonicalizeDamageType } from '@/lib/services/building-surveyor/normalization-utils';
import { withPropertyAge } from '../../walkthrough/property-age';
import { authorizeAssessmentAnchors } from '@/app/api/building-surveyor/assess/_anchor-authorization';

export const runtime = 'nodejs';
export const maxDuration = 300;

// A request may take five minutes. A crashed worker can be retried after six.
const LEASE_MS = 6 * 60 * 1000;

/** Analyse attached photos in place. Retrying never creates another assessment. */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 5 } },
  async (_request, { user, params }) => {
    const id = z.string().uuid().safeParse(params.id);
    if (!id.success) throw new BadRequestError('Invalid assessment id');
    const assessmentId = id.data;
    const { data: row, error: readError } = await serverSupabase
      .from('building_assessments')
      .select(
        'id, user_id, property_id, job_id, domain, assessment_data, validation_status, updated_at'
      )
      .eq('id', assessmentId)
      .maybeSingle();
    if (readError) throw new InternalServerError('Unable to read assessment');
    if (!row || row.user_id !== user.id)
      throw new NotFoundError('Assessment not found');

    await authorizeAssessmentAnchors({
      userId: user.id,
      propertyId: row.property_id ?? undefined,
      jobId: row.job_id ?? undefined,
      service: 'saved-assessment-analysis',
    });

    const stored = (row.assessment_data ?? {}) as Record<string, unknown>;
    const existing = getAssessmentResult(stored);
    if (existing) {
      return NextResponse.json({
        assessmentId,
        status: 'ready',
        assessment: existing,
      });
    }
    const previous = stored.analysis as { startedAt?: string } | undefined;
    const startedAt = previous?.startedAt ?? row.updated_at;
    if (
      row.validation_status === 'processing' &&
      Date.now() - Date.parse(startedAt ?? '') < LEASE_MS
    ) {
      return NextResponse.json(
        { assessmentId, status: 'processing' },
        { status: 202 }
      );
    }

    const { data: images, error: imageError } = await serverSupabase
      .from('assessment_images')
      .select('id, image_url, image_index')
      .eq('assessment_id', assessmentId)
      .order('image_index', { ascending: true });
    if (imageError)
      throw new InternalServerError('Unable to read assessment photos');
    if (!images?.length)
      throw new BadRequestError('Attach photos before starting the assessment');

    const budget = await checkAICostBudget(user.id);
    if (!budget.allowed) {
      return NextResponse.json(
        {
          error:
            budget.reason === 'check_failed'
              ? 'AI budget is temporarily unavailable'
              : 'AI usage limit reached',
        },
        { status: budget.reason === 'check_failed' ? 503 : 429 }
      );
    }

    const runId = crypto.randomUUID();
    const analysis = {
      runId,
      state: 'processing',
      startedAt: new Date().toISOString(),
    };
    // Compare-and-set against the row we read: concurrent requests cannot both own it.
    let claim = serverSupabase
      .from('building_assessments')
      .update({
        validation_status: 'processing',
        assessment_data: { ...stored, analysis },
        updated_at: analysis.startedAt,
      })
      .eq('id', assessmentId)
      .eq('user_id', user.id);
    claim = row.updated_at
      ? claim.eq('updated_at', row.updated_at)
      : claim.is('updated_at', null);
    const { data: claimed, error: claimError } = await claim
      .select('id')
      .maybeSingle();
    if (claimError) throw new InternalServerError('Unable to start assessment');
    if (!claimed) {
      return NextResponse.json(
        { assessmentId, status: 'processing' },
        { status: 202 }
      );
    }

    try {
      // Record exactly which photos were assessed; additional photos stay attached.
      const selected = images.slice(0, 4);
      const imageUrls = await resignAssessmentUrls(
        selected.map((image) => image.image_url),
        3600
      );
      if (imageUrls.length !== selected.length)
        throw new Error('Assessment photos unavailable');
      const notes =
        typeof stored.manual_notes === 'string'
          ? stored.manual_notes.slice(0, 4000)
          : undefined;
      const room = (stored.room_metadata as { room?: unknown } | undefined)
        ?.room;
      const context = await withPropertyAge(
        {
          ...(notes ? { propertyDetails: notes } : {}),
          ...(typeof room === 'string'
            ? { room: { name: room.slice(0, 200) } }
            : {}),
        },
        row.property_id ?? undefined
      );
      const { runAgent } =
        await import('@/lib/services/building-surveyor/agent/AgentRunner');
      const domain = z
        .enum(['building', 'rail', 'infrastructure', 'general'])
        .catch('building')
        .parse(row.domain);
      const { assessment } = await runAgent({
        assessmentId,
        imageUrls,
        userId: user.id,
        context,
        domain,
        propertyId: row.property_id ?? undefined,
        jobId: row.job_id ?? undefined,
      });
      const completedAt = new Date().toISOString();
      const result = {
        ...stored,
        ...assessment,
        analysis: {
          ...analysis,
          state: 'ready',
          completedAt,
          imageIds: selected.map((image) => image.id),
          imagesAssessed: selected.length,
          imagesAttached: images.length,
        },
      };
      const { data: saved, error: saveError } = await serverSupabase
        .from('building_assessments')
        .update({
          assessment_data: result,
          validation_status: 'needs_review',
          updated_at: completedAt,
          damage_type: assessment.damageAssessment.damageType,
          damage_type_canonical: canonicalizeDamageType(
            assessment.damageAssessment.damageType
          ),
          severity: assessment.damageAssessment.severity,
          confidence: assessment.damageAssessment.confidence,
          urgency: assessment.urgency.urgency,
          safety_score: assessment.safetyHazards.overallSafetyScore,
          compliance_score: assessment.compliance.complianceScore,
          insurance_risk_score: assessment.insuranceRisk.riskScore,
          recommended_trades:
            assessment.contractorAdvice.recommendedTrades ?? [],
        })
        .eq('id', assessmentId)
        .eq('user_id', user.id)
        .eq('assessment_data->analysis->>runId', runId)
        .select('id')
        .maybeSingle();
      if (saveError || !saved)
        throw new Error('Unable to save assessment result');

      after(async () => {
        try {
          const { captureAssessmentTraining } =
            await import('@/lib/services/building-surveyor/capture-assessment-training');
          await captureAssessmentTraining(
            assessmentId,
            assessment,
            imageUrls,
            context
          );
        } catch (error) {
          logger.warn('Assessment training capture failed', {
            assessmentId,
            error,
          });
        }
      });
      return NextResponse.json({
        assessmentId,
        status: 'ready',
        assessment: result,
      });
    } catch (error) {
      logger.error('Saved assessment analysis failed', {
        assessmentId,
        runId,
        error,
      });
      // Only the owning attempt may mark failure. A late worker cannot overwrite a retry.
      const { error: failureError } = await serverSupabase
        .from('building_assessments')
        .update({
          validation_status: 'ai_analysis_failed',
          updated_at: new Date().toISOString(),
          assessment_data: {
            ...stored,
            analysis: {
              ...analysis,
              state: 'failed',
              failedAt: new Date().toISOString(),
              errorCode: 'ANALYSIS_FAILED',
              retryable: true,
            },
          },
        })
        .eq('id', assessmentId)
        .eq('user_id', user.id)
        .eq('assessment_data->analysis->>runId', runId);
      if (failureError)
        logger.error('Unable to persist assessment failure', {
          assessmentId,
          error: failureError,
        });
      throw new InternalServerError(
        'Analysis could not complete. Your photos are saved; please retry.'
      );
    }
  }
);

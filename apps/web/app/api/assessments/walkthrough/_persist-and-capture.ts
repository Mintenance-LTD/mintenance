/**
 * Persistence + training-capture helpers for POST /api/assessments/walkthrough.
 * Extracted from route.ts to keep the handler under the file-size limit.
 */
import { after } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { canonicalizeDamageType } from '@/lib/services/building-surveyor/normalization-utils';
import { pickLeadFrame } from '@/lib/services/building-surveyor/video/build-walkthrough-assessment';
import type { FrameAssessmentResult } from '@/lib/services/building-surveyor/video/walkthrough-assessment';
import type {
  AssessmentContext,
  Phase1BuildingAssessment,
} from '@/lib/services/building-surveyor/types';

const SERVICE = 'assessment-walkthrough';

/**
 * Insert the merged survey as a single building_assessments row. On a re-submit
 * of the identical frame set (cache_key unique conflict) the existing row is
 * updated in place rather than duplicated. Mirrors the proven assess-route
 * insert columns.
 */
export async function persistWalkthroughRow(params: {
  userId: string;
  jobId?: string;
  propertyId?: string;
  domain: string;
  cacheKey: string;
  assessment: Phase1BuildingAssessment;
}): Promise<string | null> {
  const { userId, jobId, propertyId, domain, cacheKey, assessment } = params;
  const row = {
    user_id: userId,
    job_id: jobId ?? null,
    property_id: propertyId ?? null,
    cache_key: cacheKey,
    domain,
    damage_type: assessment.damageAssessment.damageType,
    damage_type_canonical: canonicalizeDamageType(
      assessment.damageAssessment.damageType
    ),
    severity: assessment.damageAssessment.severity,
    confidence: assessment.damageAssessment.confidence,
    safety_score: assessment.safetyHazards.overallSafetyScore,
    compliance_score: assessment.compliance.complianceScore,
    insurance_risk_score: assessment.insuranceRisk.riskScore,
    urgency: assessment.urgency.urgency,
    assessment_data: {
      ...(assessment as unknown as Record<string, unknown>),
      source: 'mobile_walkthrough',
    },
    recommended_trades: assessment.contractorAdvice.recommendedTrades || [],
    validation_status: 'pending',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await serverSupabase
    .from('building_assessments')
    .insert(row)
    .select('id')
    .single();

  if (!error && data?.id) return data.id;

  // Re-submit of an identical walkthrough — update the existing row.
  if (error?.code === '23505') {
    const { created_at: _drop, ...updateCols } = row;
    void _drop;
    const { data: updated } = await serverSupabase
      .from('building_assessments')
      .update({ ...updateCols, updated_at: new Date().toISOString() })
      .eq('cache_key', cacheKey)
      .select('id')
      .single();
    return updated?.id ?? null;
  }

  logger.error('Failed to insert walkthrough assessment row', {
    service: SERVICE,
    error: error?.message,
  });
  return null;
}

/**
 * Schedule the per-frame teacher corpus + a single lead-frame student shadow on
 * after(), so the work outlives the response (Fluid Compute freezes the
 * instance the moment the response is sent, which would otherwise kill the
 * student's 60-90s Modal cold start). Never throws.
 */
export function scheduleWalkthroughTraining(params: {
  assessmentId: string;
  perFrameAssessments: FrameAssessmentResult[];
  context?: AssessmentContext;
  openaiApiKey: string | undefined;
}): void {
  after(() => captureWalkthroughTraining(params));
}

async function captureWalkthroughTraining(params: {
  assessmentId: string;
  perFrameAssessments: FrameAssessmentResult[];
  context?: AssessmentContext;
  openaiApiKey: string | undefined;
}): Promise<void> {
  const { assessmentId, perFrameAssessments, context, openaiApiKey } = params;
  const contextData = context
    ? {
        location: context.location,
        propertyType: context.propertyType,
        ageOfProperty: context.ageOfProperty,
        propertyDetails: context.propertyDetails,
      }
    : undefined;

  // 1. Teacher corpus — one label PER FRAME (each frame's findings paired with
  //    that frame's own pixels; never the merged set, which would teach the
  //    student to hallucinate defects seen only in other frames).
  try {
    const { KnowledgeDistillationService } =
      await import('@/lib/services/building-surveyor/KnowledgeDistillationService');
    for (const frame of perFrameAssessments) {
      await KnowledgeDistillationService.recordGPT4Output(
        assessmentId,
        frame.assessment,
        [frame.url],
        contextData
      ).catch((err) => {
        logger.warn('Walkthrough frame label capture failed (non-critical)', {
          service: SERVICE,
          assessmentId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
  } catch (err) {
    logger.warn('Walkthrough corpus capture unavailable', {
      service: SERVICE,
      assessmentId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Student shadow — exactly ONE call, on the lead (most-severe) frame.
  if (!process.env.MINT_AI_VLM_ENDPOINT || !openaiApiKey) return;
  try {
    const leadAssessment = pickLeadFrame(
      perFrameAssessments.map((p) => p.assessment)
    );
    const lead =
      perFrameAssessments.find((p) => p.assessment === leadAssessment) ??
      perFrameAssessments[0];

    const [{ StudentShadowService }, { PromptBuilder }] = await Promise.all([
      import('@/lib/services/building-surveyor/distillation/StudentShadowService'),
      import('@/lib/services/building-surveyor/orchestration/PromptBuilder'),
    ]);
    const shadowMessages = PromptBuilder.buildMessages(
      [lead.url],
      context,
      lead.assessment.evidence?.roboflowDetections ?? [],
      lead.assessment.evidence?.visionAnalysis ?? null
    );
    await StudentShadowService.runShadowComparison(
      assessmentId,
      [lead.url],
      lead.assessment,
      shadowMessages as import('@/lib/services/building-surveyor/generator/AssessmentGenerator').GeneratorMessage[],
      openaiApiKey
    );
  } catch (err) {
    logger.warn('Walkthrough shadow comparison failed (non-critical)', {
      service: SERVICE,
      assessmentId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

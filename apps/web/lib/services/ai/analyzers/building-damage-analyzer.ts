/**
 * Building damage analysis using Building Surveyor agent or direct service.
 */

import crypto from 'crypto';
import { logger } from '@mintenance/shared';
import { BuildingSurveyorService } from '../../building-surveyor/BuildingSurveyorService';
import { runAgent } from '../../building-surveyor/agent/AgentRunner';
import { getDamageTaxonomyId } from '../../building-surveyor/tools/taxonomy';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { Phase1BuildingAssessment } from '../../building-surveyor/types';
import type { AnalysisContext, AnalysisResult } from './types';

/**
 * Analyze building damage: agent runner when userId present, else direct service.
 */
export async function analyzeBuildingDamage(
  images: string[],
  context: AnalysisContext,
  startTime: number
): Promise<AnalysisResult<Phase1BuildingAssessment>> {
  try {
    const buildingContext = {
      jobId: context.jobId,
      propertyType: context.propertyType || 'residential',
      roomType: context.roomType,
      urgencyOverride: context.urgency,
    };

    if (context.userId) {
      const agentResult = await tryAgentAnalysis(images, context, buildingContext, startTime);
      if (agentResult) return agentResult;
    }

    const assessment = await BuildingSurveyorService.assessDamage(images, buildingContext);
    const cost = assessment.metadata?.apiCost || 0;

    return {
      success: true,
      data: assessment,
      fallbackUsed: false,
      cost,
      service: 'building-surveyor',
      model: 'gpt-4o',
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Building assessment failed';

    if (errorMessage.includes('Budget exceeded')) {
      return {
        success: false,
        error: {
          code: 'BUDGET_EXCEEDED',
          message: errorMessage,
        },
        fallbackUsed: false,
        service: 'building-surveyor',
        processingTime: Date.now() - startTime,
      };
    }

    logger.error('Building damage analysis failed', error);

    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: errorMessage,
        details: error,
      },
      fallbackUsed: false,
      service: 'building-surveyor',
      processingTime: Date.now() - startTime,
    };
  }
}

interface BuildingContext {
  jobId?: string;
  propertyType: string;
  roomType?: string;
  urgencyOverride?: 'low' | 'medium' | 'high';
}

async function tryAgentAnalysis(
  images: string[],
  context: AnalysisContext,
  buildingContext: BuildingContext,
  startTime: number
): Promise<AnalysisResult<Phase1BuildingAssessment> | null> {
  const cacheKey = `building_assessment:${crypto
    .createHash('sha256')
    .update([...images].sort().join('|'))
    .digest('hex')}`;

  const { data: placeholderRow, error: insertError } = await serverSupabase
    .from('building_assessments')
    .insert({
      user_id: context.userId,
      job_id: context.jobId ?? null,
      property_id: context.propertyId ?? null,
      cache_key: cacheKey,
      domain: 'building',
      damage_type: 'general_damage',
      severity: 'early',
      confidence: 0,
      safety_score: 50,
      compliance_score: 50,
      insurance_risk_score: 50,
      urgency: 'monitor',
      assessment_data: {},
      validation_status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !placeholderRow?.id) {
    logger.warn('UnifiedAIService: failed to create placeholder assessment, falling back to direct', {
      error: insertError,
    });
    return null;
  }

  const result = await runAgent({
    assessmentId: placeholderRow.id,
    imageUrls: images,
    userId: context.userId!,
    context: {
      propertyType: buildingContext.propertyType as 'residential' | 'commercial' | 'industrial',
      location: undefined,
      ageOfProperty: undefined,
      propertyDetails: undefined,
    },
    jobId: context.jobId,
    propertyId: context.propertyId,
    domain: context.domain ?? 'building',
  });

  const assessment = result.assessment;
  const damageTaxonomyId = await getDamageTaxonomyId(
    'building',
    assessment.damageAssessment.damageType
  );
  await serverSupabase
    .from('building_assessments')
    .update({
      damage_type: assessment.damageAssessment.damageType,
      ...(damageTaxonomyId != null && { damage_taxonomy_id: damageTaxonomyId }),
      severity: assessment.damageAssessment.severity,
      confidence: assessment.damageAssessment.confidence,
      safety_score: assessment.safetyHazards.overallSafetyScore,
      compliance_score: assessment.compliance.complianceScore,
      insurance_risk_score: assessment.insuranceRisk.riskScore,
      urgency: assessment.urgency.urgency,
      assessment_data: assessment as unknown as Record<string, unknown>,
      validation_status: result.needsReview ? 'needs_review' : 'validated',
    })
    .eq('id', placeholderRow.id);

  const cost = assessment.metadata?.apiCost || 0;
  return {
    success: true,
    data: assessment,
    fallbackUsed: false,
    cost,
    service: 'building-surveyor-agent',
    model: 'gpt-4o',
    processingTime: Date.now() - startTime,
  };
}

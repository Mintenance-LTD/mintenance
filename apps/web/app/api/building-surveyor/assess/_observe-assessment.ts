import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { observePhotos } from '@/lib/services/building-surveyor/stages/observe-photos';
import { checkPhotoQuality } from '@/lib/services/building-surveyor/stages/check-photo-quality';
import { PhotoRecaptureError } from '@/lib/services/building-surveyor/recapture-guidance';
import { getAssessmentResult } from '@/lib/services/building-surveyor/assessment-result';
import type { ObservationAssessment } from '@/lib/services/building-surveyor/observation-assessment';

/** Dedicated staged protocol: a readable surface never needs an invented diagnosis. */
export async function assessVisibleEvidence(input: {
  userId: string;
  imageUrls: string[];
  cacheKey: string;
  apiKey: string;
  jobId?: string;
  propertyId?: string;
  domain?: string;
}) {
  const { data: cached, error: cacheError } = await db
    .from('building_assessments')
    .select('id,assessment_data,validation_status')
    .eq('cache_key', input.cacheKey)
    .eq('user_id', input.userId)
    .maybeSingle();
  if (cacheError) throw new Error('Unable to check saved visual evidence');
  if (
    cached?.assessment_data?.protocol === 'observation-only-v1' &&
    getAssessmentResult(cached.assessment_data)
  )
    return {
      ...cached.assessment_data,
      assessmentId: cached.id,
      cached: true,
      cacheSource: 'database',
    };
  if (cached?.validation_status === 'processing')
    throw new Error('This photo assessment is already processing');
  let id = cached?.id;
  if (!id) {
    // Required legacy columns retain placeholder values only. They are not scores
    // and are withheld by the status API for this explicitly versioned protocol.
    const { data, error } = await db
      .from('building_assessments')
      .insert({
        user_id: input.userId,
        job_id: input.jobId ?? null,
        property_id: input.propertyId ?? null,
        domain: input.domain ?? 'building',
        cache_key: input.cacheKey,
        damage_type: 'unknown_damage',
        severity: 'early',
        confidence: 0,
        safety_score: 50,
        compliance_score: 50,
        insurance_risk_score: 50,
        urgency: 'monitor',
        validation_status: 'processing',
        assessment_data: {
          protocol: 'observation-only-v1',
          analysis: {
            state: 'processing',
            startedAt: new Date().toISOString(),
          },
        },
      })
      .select('id')
      .single();
    if (error || !data) throw new Error('Unable to create visual assessment');
    id = data.id;
  }
  try {
    const { data: images, error: readError } = await db
      .from('assessment_images')
      .select('image_index')
      .eq('assessment_id', id);
    if (readError) throw new Error('Unable to read source image references');
    const indexes = new Set((images ?? []).map((i) => i.image_index));
    const missing = input.imageUrls
      .map((url, index) => ({
        assessment_id: id,
        image_url: url,
        image_index: index,
      }))
      .filter((i) => !indexes.has(i.image_index));
    if (missing.length) {
      const { error } = await db.from('assessment_images').insert(missing);
      if (error) throw new Error('Unable to save source photos');
    }
    const warnings = await checkPhotoQuality(input.imageUrls);
    const visualEvidence = await observePhotos(
      input.imageUrls,
      input.apiKey,
      warnings
    );
    if (!visualEvidence)
      throw new Error('Visual observation protocol is unavailable');
    const result: ObservationAssessment = {
      protocol: 'observation-only-v1',
      assessmentId: id,
      visualEvidence,
      captureWarnings: warnings,
      diagnosisStatus: 'not_established',
    };
    const { error } = await db
      .from('building_assessments')
      .update({ assessment_data: result, validation_status: 'needs_review' })
      .eq('id', id)
      .eq('user_id', input.userId);
    if (error) throw new Error('Unable to save visual evidence');
    return result;
  } catch (error) {
    const rejected = error instanceof PhotoRecaptureError;
    await db
      .from('building_assessments')
      .update({
        validation_status: 'ai_analysis_failed',
        assessment_data: {
          protocol: 'observation-only-v1',
          ...(rejected
            ? { outcome: 'insufficient_evidence', evidenceSufficient: false }
            : {}),
          analysis: {
            state: rejected ? 'insufficient_evidence' : 'failed',
            retryable: !rejected,
            ...(rejected
              ? { errorCode: error.code, captureIssue: error.captureIssue }
              : { errorCode: 'OBSERVATION_FAILED' }),
          },
        },
      })
      .eq('id', id)
      .eq('user_id', input.userId);
    throw error;
  }
}

import { logger } from '@mintenance/shared';
import { supabase } from '../../../config/supabase';
import { mobileApiClient } from '../../../utils/mobileApiClient';

/**
 * Mint AI response shape from /api/building-surveyor/assess.
 * Only the fields we actually persist back into building_assessments.
 */
interface BuildingAssessmentResponse {
  damageAssessment?: {
    damageType?: string;
    severity?: 'early' | 'developing' | 'significant' | 'dangerous';
    detected?: boolean;
    description?: string;
  };
  safetyHazards?: {
    hazards?: string[];
    hasImmediateDanger?: boolean;
  };
  insuranceRisk?: {
    score?: number;
    notes?: string;
  };
  urgency?: {
    urgency?: 'low' | 'medium' | 'high' | 'emergency';
    estimatedTimeframe?: string;
  };
  detections?: Array<{
    label: string;
    bbox_2d: [number, number, number, number];
    confidence: number;
  }>;
  contractorAdvice?: {
    recommendedTrades?: string[];
    summary?: string;
  };
}

/**
 * Map Mint AI's urgency tier (low/medium/high/emergency) to the urgency
 * enum allowed by `building_assessments.urgency` (monitor/needs_attention/
 * urgent/emergency). Conservative — when in doubt, choose more urgent.
 */
function mapUrgency(
  mintAiUrgency: string | undefined
): 'monitor' | 'needs_attention' | 'urgent' | 'emergency' {
  switch (mintAiUrgency) {
    case 'low':
      return 'monitor';
    case 'medium':
      return 'needs_attention';
    case 'high':
      return 'urgent';
    case 'emergency':
      return 'emergency';
    default:
      return 'monitor';
  }
}

/**
 * Confidence from Mint AI comes as 0-1 per detection. Use the max
 * confidence across all detections, scaled to 0-100 for the DB column.
 */
function extractConfidence(
  detections: BuildingAssessmentResponse['detections']
): number {
  if (!detections || detections.length === 0) return 0;
  const maxConf = Math.max(...detections.map((d) => d.confidence ?? 0));
  return Math.round(Math.max(0, Math.min(1, maxConf)) * 100);
}

/**
 * Kick off Mint AI analysis for an assessment that's just been submitted.
 * Fire-and-forget — the user has already seen their success alert.
 *
 * Failure modes are all logged + flagged on the row, never thrown:
 *   - No valid session → validation_status = 'ai_analysis_skipped_no_auth'
 *   - API returned 401 (auth expired mid-flight) → same
 *   - Any other failure → 'ai_analysis_failed'
 *   - Success → 'needs_review' (admin can verify AI output)
 *
 * Admins can batch-retry failed rows from the admin UI.
 */
export async function triggerAIAnalysis(
  assessmentId: string,
  imageUrls: string[],
  context: {
    propertyId?: string;
    propertyType?: string;
    domain?: string;
    gps?: { latitude: number; longitude: number } | null;
    roomMetadata?: { room?: string; floor?: number };
  }
): Promise<void> {
  if (imageUrls.length === 0) {
    logger.info('Skipping AI analysis — no photos uploaded', { assessmentId });
    return;
  }

  // Pre-flight session check. Mobile JWTs often expire on backgrounded
  // sessions; without this pre-flight, the POST would 401 and the row
  // would sit with placeholders forever. With the new middleware returning
  // 401 JSON (not a /login redirect), we'd still want to catch it early
  // here to avoid burning a Modal cold-start request that'll just 401.
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      logger.warn('Skipping AI analysis — no valid session', { assessmentId });
      await supabase
        .from('building_assessments')
        .update({ validation_status: 'ai_analysis_skipped_no_auth' })
        .eq('id', assessmentId);
      return;
    }
  } catch (authErr) {
    // Session check itself failed — log and continue; the API call will
    // fail fast if auth is truly broken.
    logger.warn('Session check failed, proceeding with analysis anyway', {
      assessmentId,
      error: authErr instanceof Error ? authErr.message : String(authErr),
    });
  }

  try {
    logger.info('Triggering Mint AI analysis', {
      assessmentId,
      photoCount: imageUrls.length,
    });

    // Call the web app's building-surveyor endpoint. Routes through
    // AssessmentGenerator → Mint AI (shadow mode) + GPT-4o.
    const result = await mobileApiClient.post<BuildingAssessmentResponse>(
      '/api/building-surveyor/assess',
      {
        imageUrls,
        propertyId: context.propertyId,
        domain: context.domain ?? 'building',
        ...(context.propertyType
          ? { context: { propertyType: context.propertyType } }
          : {}),
        ...(context.gps ? { gps: context.gps } : {}),
        ...(context.roomMetadata &&
        (context.roomMetadata.room || context.roomMetadata.floor != null)
          ? { roomMetadata: context.roomMetadata }
          : {}),
      }
    );

    if (!result) {
      throw new Error('Empty response from building-surveyor endpoint');
    }

    const damageType = result.damageAssessment?.damageType ?? 'general_damage';
    const severity = result.damageAssessment?.severity ?? 'early';
    const confidence = extractConfidence(result.detections);
    const urgency = mapUrgency(result.urgency?.urgency);
    const insuranceRiskScore = result.insuranceRisk?.score ?? 0;
    const safetyScore = result.safetyHazards?.hasImmediateDanger ? 0 : 100;

    // Merge AI output into assessment_data without clobbering wizard data.
    const { data: existing } = await supabase
      .from('building_assessments')
      .select('assessment_data')
      .eq('id', assessmentId)
      .single();

    const mergedData = {
      ...(existing?.assessment_data ?? {}),
      ai_analysis: result,
      ai_analysed_at: new Date().toISOString(),
      ai_model: 'mint-ai-vlm',
    };

    const { error: updateError } = await supabase
      .from('building_assessments')
      .update({
        damage_type: damageType,
        damage_type_canonical: damageType,
        severity,
        confidence,
        urgency,
        insurance_risk_score: insuranceRiskScore,
        safety_score: safetyScore,
        assessment_data: mergedData,
        validation_status: 'needs_review',
      })
      .eq('id', assessmentId);

    if (updateError) {
      logger.warn('AI analysis succeeded but DB update failed', {
        assessmentId,
        error: updateError.message,
      });
      await supabase
        .from('building_assessments')
        .update({ validation_status: 'ai_analysis_failed' })
        .eq('id', assessmentId);
      return;
    }

    logger.info('Mint AI analysis complete', {
      assessmentId,
      damageType,
      severity,
      confidence,
    });
  } catch (err) {
    // Check if this is an auth error specifically — the new middleware
    // returns 401 JSON which our mobileApiClient may surface as an error
    // with a distinctive message.
    const errMsg = err instanceof Error ? err.message : String(err);
    const isAuthError =
      errMsg.includes('401') ||
      errMsg.includes('unauthorized') ||
      errMsg.includes('AUTH_REQUIRED');

    logger.warn('AI analysis failed', {
      assessmentId,
      error: errMsg,
      authFailure: isAuthError,
    });

    try {
      await supabase
        .from('building_assessments')
        .update({
          validation_status: isAuthError
            ? 'ai_analysis_skipped_no_auth'
            : 'ai_analysis_failed',
        })
        .eq('id', assessmentId);
    } catch {
      /* swallow — primary failure already logged */
    }
  }
}

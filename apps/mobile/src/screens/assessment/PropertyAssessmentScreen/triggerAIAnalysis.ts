import { logger } from '@mintenance/shared';
import { supabase } from '../../../config/supabase';
import { mobileApiClient } from '../../../utils/mobileApiClient';

/**
 * 2026-04-30 audit P0-1 follow-up: writes to `building_assessments`
 * have moved off the client. The mobile client still uses
 * `supabase.auth.getSession()` (Auth API, not a table read) for the
 * pre-flight session check, but every status update now goes through
 * `PATCH /api/assessments/{id}/status` so RLS + ownership lives in
 * one place. Direct `supabase.from('building_assessments').update`
 * calls below were the last unscoped DB writes flagged by the audit.
 */
async function patchAssessmentStatus(
  assessmentId: string,
  body: Record<string, unknown>
): Promise<void> {
  try {
    await mobileApiClient.patch(
      `/api/assessments/${encodeURIComponent(assessmentId)}/status`,
      body
    );
  } catch (err) {
    // Status patch failure is non-fatal — the row stays in whatever
    // state it was; cron `agent-processor` can retry. Log so we can
    // see the rate of these in Sentry rather than swallowing.
    logger.warn('Failed to patch assessment status via API', {
      assessmentId,
      keys: Object.keys(body),
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Backend-accepted propertyType values for /api/building-surveyor/assess.
 * The mobile wizard exposes a richer UK-friendly list (House, Flat, Bungalow,
 * Commercial, Other), but the Zod schema only accepts these three. Map at
 * the boundary so the user never hits a 400 after a successful submission.
 */
const BACKEND_PROPERTY_TYPES = [
  'residential',
  'commercial',
  'industrial',
] as const;
type BackendPropertyType = (typeof BACKEND_PROPERTY_TYPES)[number];

function normalizePropertyType(
  raw: string | undefined
): BackendPropertyType | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (
    v === 'house' ||
    v === 'flat' ||
    v === 'bungalow' ||
    v === 'apartment' ||
    v === 'residential'
  ) {
    return 'residential';
  }
  if (v === 'commercial' || v === 'office' || v === 'retail' || v === 'shop') {
    return 'commercial';
  }
  if (v === 'industrial' || v === 'warehouse' || v === 'factory') {
    return 'industrial';
  }
  // 'other' or anything we don't recognise: drop it. The backend schema
  // makes propertyType optional, so omitting is safer than guessing.
  return undefined;
}

/**
 * Backend caps imageUrls at 4 (LLM token budget). Mobile lets users add up
 * to 10 photos. Send the first 4 to AI analysis — the full set is still
 * persisted on the assessment row via /api/assessments/[id]/images.
 */
const MAX_AI_IMAGE_URLS = 4;

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
      await patchAssessmentStatus(assessmentId, {
        validation_status: 'ai_analysis_skipped_no_auth',
      });
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
    // Property type is normalized to the backend Zod enum and image URLs
    // are capped at MAX_AI_IMAGE_URLS — the backend rejects requests that
    // exceed either constraint.
    const aiPropertyType = normalizePropertyType(context.propertyType);
    const cappedImageUrls = imageUrls.slice(0, MAX_AI_IMAGE_URLS);

    const result = await mobileApiClient.post<BuildingAssessmentResponse>(
      '/api/building-surveyor/assess',
      {
        imageUrls: cappedImageUrls,
        propertyId: context.propertyId,
        domain: context.domain ?? 'building',
        ...(aiPropertyType
          ? { context: { propertyType: aiPropertyType } }
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
    // The PATCH endpoint accepts an `assessment_data_patch` field and
    // does the JSON merge server-side, so we don't have to read-modify-
    // write the row from the client.
    try {
      await mobileApiClient.patch(
        `/api/assessments/${encodeURIComponent(assessmentId)}/status`,
        {
          damage_type: damageType,
          damage_type_canonical: damageType,
          severity,
          confidence,
          urgency,
          insurance_risk_score: insuranceRiskScore,
          safety_score: safetyScore,
          validation_status: 'needs_review',
          assessment_data_patch: {
            ai_analysis: result,
            ai_analysed_at: new Date().toISOString(),
            ai_model: 'mint-ai-vlm',
          },
        }
      );
    } catch (apiErr) {
      logger.warn('AI analysis succeeded but DB update failed', {
        assessmentId,
        error: apiErr instanceof Error ? apiErr.message : String(apiErr),
      });
      await patchAssessmentStatus(assessmentId, {
        validation_status: 'ai_analysis_failed',
      });
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

    await patchAssessmentStatus(assessmentId, {
      validation_status: isAuthError
        ? 'ai_analysis_skipped_no_auth'
        : 'ai_analysis_failed',
    });
  }
}

/**
 * Shared helper for the AIAssessmentScreen single-photo flow.
 *
 * Swaps the previous `/api/ai/analyze` (UnifiedAIService → GPT-4o) path for
 * `/api/building-surveyor/assess` (AssessmentGenerator → Mint AI shadow mode
 * + GPT-4o fallback). Every mobile AI assessment now flows through the
 * same pipeline as the web app, producing:
 *   1. A Mint AI training signal on every request (shadow logs)
 *   2. Consistent schema between web and mobile
 *   3. A row in building_assessments for the flywheel
 */

import { logger } from '@mintenance/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';

/** UI-facing shape preserved from the original screen — keeps the render layer unchanged. */
export interface AnalysisResult {
  damageType: string;
  severity: 'early' | 'developing' | 'significant' | 'dangerous';
  estimatedCostMin: number;
  estimatedCostMax: number;
  recommendedActions: string[];
  category: string;
  /** 0-100 percentage (not 0-1). */
  confidence: number;
  /** RICS condition rating: 1 routine, 2 repair needed, 3 serious/urgent. */
  ricsConditionRating?: 1 | 2 | 3;
  probableCause?: string;
  /** Abstention: photos insufficient for a reliable diagnosis. */
  needsOnsiteInspection?: boolean;
  onsiteInspectionReason?: string;
}

/** Subset of Phase1BuildingAssessment the mobile screen actually uses. */
interface BuildingAssessmentResponse {
  damageAssessment?: {
    damageType?: string;
    severity?: 'early' | 'developing' | 'significant' | 'dangerous';
    description?: string;
  };
  detections?: Array<{ label: string; confidence: number }>;
  insuranceRisk?: { score?: number };
  contractorAdvice?: {
    recommendedTrades?: string[];
    summary?: string;
  };
  homeownerExplanation?: string;
  ricsConditionRating?: 1 | 2 | 3;
  probableCause?: string;
  needsOnsiteInspection?: boolean;
  onsiteInspectionReason?: string;
}

/** Rough cost band per severity. Used when the backend doesn't return a cost range. */
const COST_BAND_BY_SEVERITY: Record<
  AnalysisResult['severity'],
  [number, number]
> = {
  early: [50, 200],
  developing: [200, 800],
  significant: [800, 2500],
  dangerous: [2500, 10000],
};

/**
 * Translate the Mint AI response into the legacy AnalysisResult shape the
 * screen already renders. Defensive defaults so the UI never crashes on
 * partial responses.
 */
function toAnalysisResult(
  mintResp: BuildingAssessmentResponse
): AnalysisResult {
  const damageType = mintResp.damageAssessment?.damageType ?? 'general_damage';
  const severity = mintResp.damageAssessment?.severity ?? 'early';

  const maxDetectionConfidence =
    mintResp.detections && mintResp.detections.length > 0
      ? Math.max(...mintResp.detections.map((d) => d.confidence ?? 0))
      : 0.5;

  const [costMin, costMax] = COST_BAND_BY_SEVERITY[severity] ?? [0, 0];

  const recommendedActions: string[] = [];
  if (mintResp.contractorAdvice?.summary) {
    recommendedActions.push(mintResp.contractorAdvice.summary);
  }
  if (mintResp.contractorAdvice?.recommendedTrades?.length) {
    recommendedActions.push(
      `Recommended trades: ${mintResp.contractorAdvice.recommendedTrades.join(', ')}`
    );
  }
  if (mintResp.homeownerExplanation) {
    recommendedActions.push(mintResp.homeownerExplanation);
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push(
      mintResp.damageAssessment?.description ??
        'No specific recommendations available.'
    );
  }

  return {
    damageType: damageType.replace(/_/g, ' '),
    severity,
    estimatedCostMin: costMin,
    estimatedCostMax: costMax,
    recommendedActions,
    category: damageType,
    confidence: Math.round(
      Math.max(0, Math.min(1, maxDetectionConfidence)) * 100
    ),
    ricsConditionRating: mintResp.ricsConditionRating,
    probableCause: mintResp.probableCause,
    needsOnsiteInspection: mintResp.needsOnsiteInspection,
    onsiteInspectionReason: mintResp.onsiteInspectionReason,
  };
}

const UPLOAD_TIMEOUT_MS = 60_000;

const EXT_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

/**
 * Upload a single image through the server and return a signed URL.
 *
 * Was a client-side direct-to-storage upload, which never landed bytes on
 * Hermes (the bucket held zero objects for its entire life) and returned a
 * public URL from a world-readable bucket. Both problems are gone: the server
 * owns the upload, and `assessment-photos` is private as of migration
 * 20260726135946.
 *
 * The old version also labelled every non-PNG file `image/jpeg`, so a HEIC
 * photo was stored as JPEG and the vision call received undecodable bytes.
 * The server now derives the real format from the leading bytes; the type sent
 * here is only a hint on the multipart part.
 */
async function uploadImage(uri: string): Promise<string> {
  // content:// URIs often carry no extension — naive split('.').pop()
  // returns the whole URI. Clamp to a known image extension.
  const rawExt = uri.split('.').pop()?.toLowerCase() ?? '';
  const ext = EXT_CONTENT_TYPES[rawExt] ? rawExt : 'jpg';

  const form = new FormData();
  form.append('photos', {
    uri,
    name: `quick-ai.${ext}`,
    type: EXT_CONTENT_TYPES[ext]!,
  } as unknown as Blob);

  const result = await mobileApiClient.postFormData<{ urls: string[] }>(
    '/api/assessments/photo-upload',
    form,
    UPLOAD_TIMEOUT_MS
  );

  const url = result?.urls?.[0];
  if (!url) {
    throw new Error('Upload failed: the photo could not be stored');
  }
  return url;
}

/**
 * Main entry point for AIAssessmentScreen.
 *
 * Flow:
 *   1. Upload the photo to Supabase Storage so it has a URL
 *   2. Call /api/building-surveyor/assess with the URL
 *   3. Translate Mint AI's response to the legacy UI shape
 *
 * Errors:
 *   - Upload failures → throw (so the mutation onError handler fires)
 *   - API failures → throw
 *   - 401 (session expired) → throws with recognisable message for UI
 */
export async function analyzeWithMintAI(
  imageUri: string
): Promise<AnalysisResult> {
  logger.info('AIAssessmentScreen → Mint AI analysis starting', {
    uri: imageUri.slice(0, 80),
  });

  const imageUrl = await uploadImage(imageUri);

  const mintResponse = await mobileApiClient.post<BuildingAssessmentResponse>(
    '/api/building-surveyor/assess',
    {
      imageUrls: [imageUrl],
      domain: 'building',
      context: { propertyType: 'residential' },
    }
  );

  if (!mintResponse) {
    throw new Error('Empty response from Mint AI');
  }

  return toAnalysisResult(mintResponse);
}

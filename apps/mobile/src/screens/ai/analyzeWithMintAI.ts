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
import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';

/** UI-facing shape preserved from the original screen — keeps the render layer unchanged. */
export interface AnalysisResult {
  damageType: string;
  severity: 'early' | 'developing' | 'significant' | 'dangerous';
  estimatedCostMin: number;
  estimatedCostMax: number;
  recommendedActions: string[];
  category: string;
  confidence: number;
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
  };
}

/**
 * Upload a single image to the `assessment-photos` bucket and return the
 * public URL. Same pattern used by PropertyAssessmentScreen's uploadPhotos.
 * NOTE: bucket is currently public — see security follow-up in
 * docs/MINT_AI_VLM_v2.md §9.
 */
async function uploadImage(uri: string): Promise<string> {
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const filePath = `quick-ai/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error } = await supabase.storage
    .from('assessment-photos')
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage
    .from('assessment-photos')
    .getPublicUrl(filePath);
  return data.publicUrl;
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

import { isAssessmentUnassessable } from '@mintenance/shared';
import { parseVisualObservation } from './generator/visual-observation';
/** Read both current surveys and the older mobile wizard's nested result. */
function hasDamageResult(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const damage = value as Record<string, unknown>;
  return (
    typeof damage.damageType === 'string' &&
    damage.damageType.trim().length > 0 &&
    typeof damage.confidence === 'number' &&
    Number.isFinite(damage.confidence)
  );
}

export function getAssessmentResult(
  data: unknown
): Record<string, unknown> | null {
  if (isAssessmentUnassessable(data)) return null;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (record.protocol === 'observation-only-v1') {
    const evidence = record.visualEvidence as
      | {
          version?: string;
          diagnosisStatus?: string;
          photos?: Array<{ photoIndex: number; observation: unknown }>;
        }
      | undefined;
    if (
      evidence?.version !== 'visible-evidence-v1' ||
      evidence.diagnosisStatus !== 'not_established' ||
      !Array.isArray(evidence.photos) ||
      evidence.photos.length < 1 ||
      evidence.photos.length > 4
    )
      return null;
    try {
      for (const [index, photo] of evidence.photos.entries()) {
        if (photo.photoIndex !== index) return null;
        if (
          parseVisualObservation(JSON.stringify(photo.observation), 'stop', 1)
            .outcome === 'insufficient_evidence'
        )
          return null;
      }
      return record;
    } catch {
      return null;
    }
  }
  if (hasDamageResult(record.damageAssessment)) {
    return record;
  }
  const nested = record.ai_analysis;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const result = nested as Record<string, unknown>;
    if (hasDamageResult(result.damageAssessment)) {
      return result;
    }
  }
  return null;
}

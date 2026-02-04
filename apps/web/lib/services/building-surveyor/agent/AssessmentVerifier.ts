/**
 * Phase 7: Optional verifier - check detection/SAM3 vs final narrative damage_type.
 * If misaligned, set needs_review on assessment.
 */

import type { Phase1BuildingAssessment } from '../types';

export interface VerifierEvidence {
  detectDamageTypes: string[];
  segmentDamageTypes: string[];
}

/**
 * Returns true if narrative damage_type aligns with detector/segment evidence (no need for review).
 * If final damage type is not in detect or segment evidence, suggest needs_review.
 */
export function verifyAlignment(
  assessment: Phase1BuildingAssessment,
  evidence: VerifierEvidence
): { aligned: boolean; needsReview: boolean } {
  const narrativeType = assessment.damageAssessment.damageType?.toLowerCase().trim();
  if (!narrativeType) {
    return { aligned: false, needsReview: true };
  }

  const detectSet = new Set(evidence.detectDamageTypes.map((t) => t.toLowerCase()));
  const segmentSet = new Set(evidence.segmentDamageTypes.map((t) => t.toLowerCase()));

  const inDetect = detectSet.has(narrativeType);
  const inSegment = segmentSet.has(narrativeType);
  const hasEvidence = evidence.detectDamageTypes.length > 0 || evidence.segmentDamageTypes.length > 0;

  if (!hasEvidence) {
    return { aligned: true, needsReview: false };
  }

  const aligned = inDetect || inSegment;
  return { aligned, needsReview: !aligned };
}

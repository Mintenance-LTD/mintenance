/** An absent judgement must never be displayed as a healthy building. */
export const INSUFFICIENT_EVIDENCE_MESSAGE =
  'Unable to assess these photos. Retake clear, well-lit photos showing the building element and any suspected fault. Safety and condition have not been assessed.';

export function isAssessmentUnassessable(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  const damage = data.damageAssessment as Record<string, unknown> | undefined;
  const analysis = data.analysis as Record<string, unknown> | undefined;
  return (
    data.evidenceSufficient === false ||
    data.outcome === 'insufficient_evidence' ||
    analysis?.errorCode === 'INSUFFICIENT_EVIDENCE' ||
    (typeof (damage?.confidence ?? data.confidence) === 'number' &&
      Number(damage?.confidence ?? data.confidence) <= 0) ||
    (!!data.ai_analysis && isAssessmentUnassessable(data.ai_analysis))
  );
}

export class InsufficientEvidenceError extends Error {
  readonly code = 'INSUFFICIENT_EVIDENCE';
  constructor() {
    super(INSUFFICIENT_EVIDENCE_MESSAGE);
    this.name = 'InsufficientEvidenceError';
  }
}

export function requireAssessmentEvidence(value: unknown): void {
  if (isAssessmentUnassessable(value)) throw new InsufficientEvidenceError();
}

import { ServiceUnavailableError } from '@/lib/errors/api-error';

/**
 * Beta scope: operational assessments do not authorize secondary training use.
 * No environment flag can bypass this hold. Replace it only when per-source
 * consent, provenance and withdrawal checks cover both new and historical data.
 */
export function isTrainingReuseAllowed(): boolean {
  return false;
}

/** Customer assessments must not become examples or learned adjustments for
 * other assessments, including the supervised pilot. Curated reference knowledge
 * is separate. Keep this hold until source consent and held-out exclusions exist. */
export function isAssessmentMemoryReuseAllowed(): boolean {
  return false;
}

export function assertTrainingReuseAllowed(): void {
  if (!isTrainingReuseAllowed()) {
    throw new ServiceUnavailableError('Training data reuse is unavailable during beta');
  }
}

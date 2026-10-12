import { ServiceUnavailableError } from '@/lib/errors/api-error';

/**
 * Beta scope: operational assessments do not authorize secondary training use.
 * No environment flag can bypass this hold. Replace it only when per-source
 * consent, provenance and withdrawal checks cover both new and historical data.
 */
export function isTrainingReuseAllowed(): boolean {
  return false;
}

export function assertTrainingReuseAllowed(): void {
  if (!isTrainingReuseAllowed()) {
    throw new ServiceUnavailableError('Training data reuse is unavailable during beta');
  }
}

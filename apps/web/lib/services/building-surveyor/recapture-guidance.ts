import {
  InsufficientEvidenceError,
  INSUFFICIENT_EVIDENCE_MESSAGE,
} from '@mintenance/shared';

export const RECAPTURE_GUIDANCE = {
  insufficient_detail:
    'Retake a sharp, well-lit close-up and a wider view. The visible detail is insufficient to assess this photo.',
  too_small: 'Upload the original full-resolution photo, not a thumbnail.',
  too_dark:
    'Retake the photo with more even lighting and the fault clearly visible.',
  overexposed:
    'Retake the photo without glare or direct flash washing out the surface.',
} as const;
export type PhotoQualityIssue = keyof typeof RECAPTURE_GUIDANCE;
export interface CaptureIssue {
  photoIndex: number;
  issue: PhotoQualityIssue;
}
export interface CaptureWarning {
  photoIndex: number;
  reason: 'soft_focus' | 'low_detail';
}

export class PhotoRecaptureError extends InsufficientEvidenceError {
  constructor(public readonly captureIssue: CaptureIssue) {
    super();
    this.message = formatCaptureIssue(captureIssue);
  }
}

function formatCaptureIssue(value: CaptureIssue): string {
  return `Photo ${value.photoIndex + 1}: ${RECAPTURE_GUIDANCE[value.issue]} Safety and condition have not been assessed.`;
}

/** Render only known reason codes, never arbitrary saved error/model prose. */
export function getRecaptureMessage(assessment: unknown): string {
  if (!assessment || typeof assessment !== 'object')
    return INSUFFICIENT_EVIDENCE_MESSAGE;
  const data = assessment as Record<string, unknown>;
  const analysis = data.analysis as Record<string, unknown> | undefined;
  const value = analysis?.captureIssue as CaptureIssue | undefined;
  if (
    value &&
    Number.isInteger(value.photoIndex) &&
    value.photoIndex >= 0 &&
    value.photoIndex < 100 &&
    Object.prototype.hasOwnProperty.call(RECAPTURE_GUIDANCE, value.issue)
  )
    return formatCaptureIssue(value);
  return INSUFFICIENT_EVIDENCE_MESSAGE;
}

import type { VisualEvidence } from './stages/observe-photos';
import type { CaptureWarning } from './recapture-guidance';
export interface ObservationAssessment {
  protocol: 'observation-only-v1';
  assessmentId: string;
  visualEvidence: VisualEvidence;
  captureWarnings: CaptureWarning[];
  diagnosisStatus: 'not_established';
}

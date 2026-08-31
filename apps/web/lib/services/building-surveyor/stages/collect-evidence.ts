import type { RoboflowDetection, VisionAnalysisSummary } from '../types';
import type { DamageTypeSegmentation } from '../SAM3Service';

interface EvidenceResult {
  roboflowDetections: RoboflowDetection[];
  visionAnalysis: VisionAnalysisSummary | null;
  sam3Segmentation: DamageTypeSegmentation | undefined;
  hasMachineEvidence: boolean;
}

interface PreRunEvidence {
  roboflowDetections: RoboflowDetection[];
  visionAnalysis: VisionAnalysisSummary | null;
  sam3Segmentation?: DamageTypeSegmentation;
}

/**
 * Normalizes optional pre-run evidence. The production pipeline no longer
 * invokes YOLO/Roboflow or SAM: those unvalidated outputs must not influence
 * user-facing assessments, confidence, or safety decisions.
 */
export async function collectEvidence(
  _validatedImageUrls: string[],
  _detectorTimeoutMs: number,
  _visionTimeoutMs: number,
  _preRunEvidence?: PreRunEvidence
): Promise<EvidenceResult> {
  return {
    roboflowDetections: [],
    visionAnalysis: null,
    sam3Segmentation: undefined,
    hasMachineEvidence: false,
  };
}

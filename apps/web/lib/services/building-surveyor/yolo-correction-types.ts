import type { RoboflowDetection } from './types';

interface DetectionAdjustment {
  original: RoboflowDetection;
  corrected: RoboflowDetection;
}

export interface YOLOCorrection {
  id?: string;
  assessmentId: string;
  imageUrl: string;
  imageIndex?: number;
  originalDetections: RoboflowDetection[];
  correctedLabels?: string; // YOLO format
  correctionsMade?: {
    added?: Array<{
      class: string;
      bbox: { x: number; y: number; width: number; height: number };
    }>;
    removed?: Array<{
      class: string;
      bbox: { x: number; y: number; width: number; height: number };
    }>;
    adjusted?: Array<DetectionAdjustment>;
    classChanged?: Array<DetectionAdjustment>;
  };
  correctedBy?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'needs_review';
  confidenceScore?: number;
  correctionQuality?: 'expert' | 'verified' | 'user';
}

export interface CorrectionInput {
  assessmentId: string;
  imageUrl: string;
  imageIndex?: number;
  originalDetections: RoboflowDetection[];
  correctedDetections: Array<
    | RoboflowDetection
    | {
        class: string;
        bbox: { x: number; y: number; width: number; height: number };
        confidence?: number;
      }
  >;
  correctionsMade?: YOLOCorrection['correctionsMade'];
  correctedBy: string;
  correctionQuality?: 'expert' | 'verified' | 'user';
}

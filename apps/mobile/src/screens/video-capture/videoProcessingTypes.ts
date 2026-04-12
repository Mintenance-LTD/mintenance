/**
 * Types + constants for VideoProcessingStatusScreen.
 * Extracted to keep the parent screen under 500 lines.
 */

export interface DamageData {
  instance_count: number;
  average_confidence: number;
  temporal_coverage: number;
  severity_estimate: string;
}

export interface AggregatedAssessment {
  overall_severity: string;
  confidence_level: string;
  total_unique_damages: number;
  damage_summary: Record<string, DamageData>;
  high_priority_damages: string[];
  video_metadata: {
    duration_seconds: number;
    processed_frames: number;
    resolution: { width: number; height: number };
  };
}

export interface ProcessingResults {
  aggregated_assessment?: AggregatedAssessment;
}

export interface QueueStatus {
  pending: number;
  uploading: number;
  processing: number;
  completed: number;
  failed: number;
  current: { id: string; status: string } | null;
}

export interface ProcessingStage {
  stage:
    | 'queued'
    | 'uploading'
    | 'processing'
    | 'analyzing'
    | 'completed'
    | 'failed';
  title: string;
  description: string;
  icon: string;
  progress?: number;
}

export const PROCESSING_STAGES: ProcessingStage[] = [
  {
    stage: 'queued',
    title: 'Queued',
    description: 'Video is waiting to be processed',
    icon: 'schedule',
  },
  {
    stage: 'uploading',
    title: 'Uploading',
    description: 'Uploading video to cloud storage',
    icon: 'cloud-upload',
  },
  {
    stage: 'processing',
    title: 'Processing',
    description: 'AI is analyzing your video frame by frame',
    icon: 'memory',
  },
  {
    stage: 'analyzing',
    title: 'Analyzing',
    description: 'Identifying damage and generating assessment',
    icon: 'analytics',
  },
  {
    stage: 'completed',
    title: 'Complete',
    description: 'Assessment ready',
    icon: 'check-circle',
  },
];

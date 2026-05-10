/**
 * Shared types + constants for the video capture/upload pipeline.
 * Extracted from `services/VideoService.ts` on 2026-05-09. Namespaced
 * under `video/upload/` to keep separation from `video/types.ts`,
 * which holds video-call (peer-to-peer) types.
 */

export interface VideoMetadata {
  duration: number;
  size: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  orientation: 'portrait' | 'landscape';
}

export interface VideoUploadProgress {
  uploaded: number;
  total: number;
  percentage: number;
}

export interface VideoProcessingResult {
  id: string;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  sam2ProcessingId?: string;
  damageAssessment?: unknown;
  error?: string;
  progress?: number;
}

export interface VideoQueueItem {
  id: string;
  videoPath: string;
  metadata: VideoMetadata;
  propertyId?: string;
  assessmentId?: string;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface VideoGuidancePhase {
  phase: 'exterior' | 'interior' | 'damage_detail' | 'overview';
  title: string;
  duration: number;
  instructions: string[];
  tips: string[];
}

export const VIDEO_CONSTRAINTS = {
  MAX_DURATION: 60,
  MIN_DURATION: 30,
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  TARGET_BITRATE: 2_000_000,
  TARGET_FPS: 30,
  TARGET_RESOLUTION: { width: 1280, height: 720 },
} as const;

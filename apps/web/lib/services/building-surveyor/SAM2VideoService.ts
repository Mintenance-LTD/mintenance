/**
 * SAM2 Video Segmentation Service (server-side client)
 *
 * Talks to the Python SAM2 video microservice (apps/sam2-video-service)
 * which performs temporal damage tracking across extracted video frames.
 *
 * The service is asynchronous: POST /process-video-url enqueues a job and
 * returns a processing_id; the caller polls GET /processing-status/{id}
 * until status === 'completed' (or 'failed'). The completed payload carries
 * `result.aggregated_assessment` + `result.trajectories`.
 *
 * Mirrors SAM3Service's conventions: env-gated base URL, X-API-Key auth,
 * bounded timeouts, and graceful null returns so an unconfigured or
 * unreachable service degrades (the assessment is routed to manual review)
 * rather than throwing into the upload/poll request paths.
 */

import { logger } from '@mintenance/shared';

// ── Wire types (subset of apps/sam2-video-service/app/schemas) ──────────

export interface SAM2TrackingPoint {
  frame_number: number;
  timestamp_seconds: number;
  bounding_box: { x: number; y: number; width: number; height: number };
  confidence: number;
  area_pixels?: number | null;
}

export interface SAM2Trajectory {
  track_id: string;
  damage_type: string;
  first_frame: number;
  last_frame: number;
  duration_seconds: number;
  average_confidence: number;
  max_confidence: number;
  tracking_points: SAM2TrackingPoint[];
  is_consistent: boolean;
  consistency_score: number;
}

export interface SAM2AggregatedDamageItem {
  damage_type: string;
  instance_count: number;
  total_detections: number;
  average_confidence: number;
  max_confidence: number;
  temporal_coverage: number;
  severity_estimate: string;
  trajectories: SAM2Trajectory[];
}

export interface SAM2AggregatedAssessment {
  processing_id: string;
  video_metadata: {
    total_frames: number;
    processed_frames: number;
    duration_seconds: number;
    extraction_fps: number;
    resolution: { width: number; height: number };
  };
  damage_summary: Record<string, SAM2AggregatedDamageItem>;
  total_unique_damages: number;
  overall_severity: string;
  confidence_level: string;
  high_priority_damages: string[];
  temporal_analysis: Record<string, unknown>;
}

export interface SAM2ProcessingStatus {
  processing_id: string;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string | null;
  error?: string | null;
  result?: {
    aggregated_assessment?: SAM2AggregatedAssessment;
    trajectories?: SAM2Trajectory[];
  } | null;
}

const DEFAULT_DAMAGE_TYPES = [
  'water damage',
  'crack',
  'rot',
  'mold',
  'structural damage',
];

export class SAM2VideoService {
  /**
   * Base URL of the SAM2 microservice. Server-only env var (no
   * EXPO_PUBLIC_ prefix) so the API key never ships in a client bundle.
   * Returns null when unset rather than throwing — callers treat a null
   * base URL as "video AI unavailable" and route to manual review.
   */
  private static get baseUrl(): string | null {
    return process.env.SAM2_VIDEO_SERVICE_URL || null;
  }

  private static readonly TIMEOUT_MS =
    Number(process.env.SAM2_VIDEO_TIMEOUT_MS) || 15000;

  static isConfigured(): boolean {
    return !!this.baseUrl;
  }

  private static getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiKey = process.env.SAM2_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    } else if (process.env.NODE_ENV === 'production') {
      logger.warn('SAM2_API_KEY not set — requests will be rejected by SAM2', {
        service: 'sam2-video-service',
      });
    }
    return headers;
  }

  /**
   * Enqueue a video URL for processing. Returns the processing_id to poll,
   * or null if the service is unconfigured / unreachable / rejected.
   */
  static async startProcessing(
    videoUrl: string,
    damageTypes: string[] = DEFAULT_DAMAGE_TYPES
  ): Promise<string | null> {
    if (!this.baseUrl) {
      logger.info('SAM2 video service not configured — skipping kickoff', {
        service: 'sam2-video-service',
      });
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/process-video-url`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          video_url: videoUrl,
          damage_types: damageTypes,
          extraction_fps: 2.0,
          confidence_threshold: 0.5,
          max_duration_seconds: 60,
        }),
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        logger.warn('SAM2 startProcessing rejected', {
          service: 'sam2-video-service',
          status: response.status,
          detail: detail.slice(0, 200),
        });
        return null;
      }

      const data = (await response.json()) as { processing_id?: string };
      return data.processing_id ?? null;
    } catch (error) {
      logger.warn('SAM2 startProcessing failed', {
        service: 'sam2-video-service',
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Poll a job's status. Returns null on transport failure so the caller
   * can retry on the next poll/cron tick rather than crashing.
   */
  static async getStatus(
    processingId: string
  ): Promise<SAM2ProcessingStatus | null> {
    if (!this.baseUrl) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}/processing-status/${encodeURIComponent(processingId)}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
          signal: AbortSignal.timeout(this.TIMEOUT_MS),
        }
      );

      if (!response.ok) {
        logger.warn('SAM2 getStatus non-OK', {
          service: 'sam2-video-service',
          status: response.status,
          processingId,
        });
        return null;
      }

      return (await response.json()) as SAM2ProcessingStatus;
    } catch (error) {
      logger.warn('SAM2 getStatus failed', {
        service: 'sam2-video-service',
        processingId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

/**
 * SAM 2 Video Segmentation Service
 * Client for SAM 2 video processing microservice with temporal tracking
 */

import { logger } from '@mintenance/shared';

// Request/Response Types
export interface VideoSegmentationRequest {
  video_url?: string;
  video_base64?: string;
  damage_types?: string[];
  extraction_fps?: number;
  confidence_threshold?: number;
  max_duration_seconds?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DamageInstance {
  damage_type: string;
  confidence: number;
  bounding_box: BoundingBox;
  mask?: number[][];
  area_pixels?: number;
}

export interface FrameDetection {
  frame_number: number;
  timestamp_seconds: number;
  detections: DamageInstance[];
  presence_scores: Record<string, number>;
}

export interface TrackingPoint {
  frame_number: number;
  timestamp_seconds: number;
  bounding_box: BoundingBox;
  confidence: number;
  area_pixels?: number;
}

export interface DamageTrajectory {
  track_id: string;
  damage_type: string;
  first_frame: number;
  last_frame: number;
  duration_seconds: number;
  average_confidence: number;
  max_confidence: number;
  tracking_points: TrackingPoint[];
  is_consistent: boolean;
  consistency_score: number;
}

export interface AggregatedDamageItem {
  damage_type: string;
  instance_count: number;
  total_detections: number;
  average_confidence: number;
  max_confidence: number;
  temporal_coverage: number;
  severity_estimate: 'early' | 'midway' | 'full' | 'none';
  trajectories: DamageTrajectory[];
}

export interface VideoMetadata {
  total_frames: number;
  processed_frames: number;
  duration_seconds: number;
  extraction_fps: number;
  resolution: {
    width: number;
    height: number;
  };
}

export interface TemporalAnalysis {
  detection_timeline: Array<{ frame: number; count: number }>;
  peak_detection_frame: number | null;
  peak_detection_count: number;
  detection_density: number;
  temporal_clustering: 'clustered' | 'distributed' | 'sparse' | 'none';
  temporal_spread: number;
  frames_with_detection: number;
  total_frames_analyzed: number;
}

export interface AggregatedDamageAssessment {
  processing_id: string;
  video_metadata: VideoMetadata;
  damage_summary: Record<string, AggregatedDamageItem>;
  total_unique_damages: number;
  overall_severity: 'early' | 'midway' | 'full' | 'none';
  confidence_level: 'low' | 'medium' | 'high';
  high_priority_damages: string[];
  temporal_analysis: TemporalAnalysis;
}

export interface VideoProcessingStatus {
  processing_id: string;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  started_at: string;
  completed_at?: string;
  error?: string;
  result?: {
    aggregated_assessment: AggregatedDamageAssessment;
    trajectories: DamageTrajectory[];
    frame_detections: FrameDetection[];
  };
}

export interface VideoSegmentationResponse {
  processing_id: string;
  status: string;
  message?: string;
  estimated_time_seconds?: number;
}

export class SAM2VideoService {
  private static get BASE_URL(): string {
    const url = process.env.SAM2_VIDEO_SERVICE_URL;
    if (url) return url;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SAM2_VIDEO_SERVICE_URL is required in production');
    }
    return 'http://localhost:8002';
  }

  private static readonly TIMEOUT_MS = Number(process.env.SAM2_VIDEO_TIMEOUT_MS) || 120000; // 2 minutes

  private static readonly POLLING_INTERVAL_MS = 2000; // Poll every 2 seconds

  // Circuit breaker for failures
  private static failureCount = 0;
  private static lastFailureTime = 0;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private static readonly CIRCUIT_BREAKER_RESET_TIME = 300000; // 5 minutes

  /**
   * Check if circuit breaker is open
   */
  private static isCircuitBreakerOpen(): boolean {
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.CIRCUIT_BREAKER_RESET_TIME) {
        return true;
      }
      // Reset circuit breaker after timeout
      this.failureCount = 0;
    }
    return false;
  }

  /**
   * Record failure for circuit breaker
   */
  private static recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  /**
   * Reset failure count on success
   */
  private static recordSuccess(): void {
    this.failureCount = 0;
  }

  /**
   * Check if SAM 2 video service is available
   */
  static async healthCheck(): Promise<boolean> {
    if (this.isCircuitBreakerOpen()) {
      logger.warn('SAM2VideoService circuit breaker is open', {
        service: 'sam2-video-service',
      });
      return false;
    }

    try {
      const response = await fetch(`${this.BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return false;

      const data = await response.json();
      const result = data.status === 'healthy' && data.model_loaded === true;

      this.recordSuccess();
      return result;
    } catch (error) {
      logger.warn('SAM2VideoService health check failed', {
        service: 'sam2-video-service',
        error: error instanceof Error ? error.message : String(error),
      });

      this.recordFailure();
      return false;
    }
  }

  /**
   * Process video from URL with temporal tracking
   */
  static async processVideoUrl(
    videoUrl: string,
    damageTypes?: string[],
    options?: {
      extractionFps?: number;
      confidenceThreshold?: number;
      maxDurationSeconds?: number;
    }
  ): Promise<VideoSegmentationResponse> {
    if (this.isCircuitBreakerOpen()) {
      throw new Error('SAM2 video service circuit breaker is open');
    }

    try {
      const response = await fetch(`${this.BASE_URL}/process-video-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: videoUrl,
          damage_types: damageTypes || ['water damage', 'crack', 'rot', 'mold', 'structural damage'],
          extraction_fps: options?.extractionFps || 2.0,
          confidence_threshold: options?.confidenceThreshold || 0.5,
          max_duration_seconds: options?.maxDurationSeconds || 60,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Video processing failed: ${error}`);
      }

      const result = (await response.json()) as VideoSegmentationResponse;

      this.recordSuccess();

      logger.info('SAM2 video processing started', {
        service: 'sam2-video-service',
        processingId: result.processing_id,
      });

      return result;
    } catch (error) {
      this.recordFailure();
      logger.error('SAM2VideoService failed to start video processing', {
        service: 'sam2-video-service',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Process uploaded video file
   */
  static async processVideoFile(
    videoFile: File,
    damageTypes?: string[],
    options?: {
      extractionFps?: number;
      confidenceThreshold?: number;
      maxDurationSeconds?: number;
    }
  ): Promise<VideoSegmentationResponse> {
    if (this.isCircuitBreakerOpen()) {
      throw new Error('SAM2 video service circuit breaker is open');
    }

    try {
      const formData = new FormData();
      formData.append('video_file', videoFile);

      // Add damage types as query parameters
      const params = new URLSearchParams();
      if (damageTypes) {
        damageTypes.forEach(type => params.append('damage_types', type));
      }

      const response = await fetch(
        `${this.BASE_URL}/process-video?${params.toString()}`,
        {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Video processing failed: ${error}`);
      }

      const result = (await response.json()) as VideoSegmentationResponse;

      this.recordSuccess();

      logger.info('SAM2 video file processing started', {
        service: 'sam2-video-service',
        processingId: result.processing_id,
        fileName: videoFile.name,
        fileSize: videoFile.size,
      });

      return result;
    } catch (error) {
      this.recordFailure();
      logger.error('SAM2VideoService failed to process video file', {
        service: 'sam2-video-service',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get processing status
   */
  static async getProcessingStatus(processingId: string): Promise<VideoProcessingStatus> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/processing-status/${processingId}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Processing ID not found');
        }
        const error = await response.text();
        throw new Error(`Failed to get status: ${error}`);
      }

      return (await response.json()) as VideoProcessingStatus;
    } catch (error) {
      logger.error('SAM2VideoService failed to get processing status', {
        service: 'sam2-video-service',
        processingId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Wait for processing to complete with polling
   */
  static async waitForCompletion(
    processingId: string,
    options?: {
      maxWaitMs?: number;
      onProgress?: (progress: number, message?: string) => void;
    }
  ): Promise<VideoProcessingStatus> {
    const maxWaitMs = options?.maxWaitMs || this.TIMEOUT_MS;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const status = await this.getProcessingStatus(processingId);

        // Update progress callback
        if (options?.onProgress) {
          options.onProgress(status.progress, status.message);
        }

        // Check if completed
        if (status.status === 'completed') {
          logger.info('SAM2 video processing completed', {
            service: 'sam2-video-service',
            processingId,
            duration: Date.now() - startTime,
          });
          return status;
        }

        // Check if failed
        if (status.status === 'failed') {
          throw new Error(status.error || 'Video processing failed');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL_MS));
      } catch (error) {
        // If it's a 404, the processing might have been cleaned up
        if (error instanceof Error && error.message.includes('not found')) {
          throw new Error('Processing job not found or expired');
        }
        throw error;
      }
    }

    throw new Error(`Video processing timed out after ${maxWaitMs}ms`);
  }

  /**
   * Process video and wait for results (convenience method)
   */
  static async processVideoAndWait(
    videoUrlOrFile: string | File,
    damageTypes?: string[],
    options?: {
      extractionFps?: number;
      confidenceThreshold?: number;
      maxDurationSeconds?: number;
      maxWaitMs?: number;
      onProgress?: (progress: number, message?: string) => void;
    }
  ): Promise<AggregatedDamageAssessment> {
    // Start processing
    let response: VideoSegmentationResponse;

    if (typeof videoUrlOrFile === 'string') {
      response = await this.processVideoUrl(videoUrlOrFile, damageTypes, options);
    } else {
      response = await this.processVideoFile(videoUrlOrFile, damageTypes, options);
    }

    // Wait for completion
    const status = await this.waitForCompletion(response.processing_id, {
      maxWaitMs: options?.maxWaitMs,
      onProgress: options?.onProgress,
    });

    if (!status.result?.aggregated_assessment) {
      throw new Error('No assessment results available');
    }

    return status.result.aggregated_assessment;
  }

  /**
   * Get aggregated assessment for completed processing
   */
  static async getAggregatedAssessment(
    processingId: string
  ): Promise<AggregatedDamageAssessment> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/aggregated-assessment/${processingId}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get assessment: ${error}`);
      }

      return (await response.json()) as AggregatedDamageAssessment;
    } catch (error) {
      logger.error('SAM2VideoService failed to get aggregated assessment', {
        service: 'sam2-video-service',
        processingId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clean up processing data
   */
  static async cleanupProcessing(processingId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/processing-status/${processingId}`,
        {
          method: 'DELETE',
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        throw new Error(`Failed to cleanup: ${error}`);
      }

      logger.debug('SAM2 video processing cleaned up', {
        service: 'sam2-video-service',
        processingId,
      });
    } catch (error) {
      logger.warn('SAM2VideoService cleanup failed', {
        service: 'sam2-video-service',
        processingId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Format video assessment results for display
   */
  static formatAssessmentSummary(assessment: AggregatedDamageAssessment): string {
    const lines: string[] = [];

    lines.push(`Video Assessment Summary (${assessment.processing_id})`);
    lines.push('─'.repeat(50));

    // Video info
    lines.push(`Duration: ${assessment.video_metadata.duration_seconds.toFixed(1)}s`);
    lines.push(`Frames analyzed: ${assessment.video_metadata.processed_frames}`);
    lines.push(`Resolution: ${assessment.video_metadata.resolution.width}x${assessment.video_metadata.resolution.height}`);
    lines.push('');

    // Overall assessment
    lines.push(`Overall Severity: ${assessment.overall_severity.toUpperCase()}`);
    lines.push(`Confidence Level: ${assessment.confidence_level}`);
    lines.push(`Unique Damage Instances: ${assessment.total_unique_damages}`);
    lines.push('');

    // Damage breakdown
    if (Object.keys(assessment.damage_summary).length > 0) {
      lines.push('Damage Types Detected:');
      for (const [type, info] of Object.entries(assessment.damage_summary)) {
        if (info.instance_count > 0) {
          lines.push(
            `  • ${type}: ${info.instance_count} instance(s), ` +
            `severity: ${info.severity_estimate}, ` +
            `confidence: ${(info.average_confidence * 100).toFixed(1)}%, ` +
            `coverage: ${(info.temporal_coverage * 100).toFixed(1)}%`
          );
        }
      }
    } else {
      lines.push('No damage detected in video');
    }

    // High priority damages
    if (assessment.high_priority_damages.length > 0) {
      lines.push('');
      lines.push('⚠️ HIGH PRIORITY DAMAGES:');
      assessment.high_priority_damages.forEach(type => {
        lines.push(`  • ${type}`);
      });
    }

    // Temporal analysis
    if (assessment.temporal_analysis) {
      lines.push('');
      lines.push('Temporal Analysis:');
      lines.push(`  Detection density: ${(assessment.temporal_analysis.detection_density * 100).toFixed(1)}%`);
      lines.push(`  Clustering pattern: ${assessment.temporal_analysis.temporal_clustering}`);
      if (assessment.temporal_analysis.peak_detection_frame !== null) {
        lines.push(`  Peak detection at frame: ${assessment.temporal_analysis.peak_detection_frame}`);
      }
    }

    return lines.join('\n');
  }
}
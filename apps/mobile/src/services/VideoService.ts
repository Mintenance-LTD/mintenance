/**
 * Video Capture and Processing Service
 * Handles video capture, compression, upload, and SAM2 integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { logger } from '@mintenance/shared';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { mobileApiClient } from '../utils/mobileApiClient';

// Types
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

class VideoService {
  private static instance: VideoService;
  private uploadQueue: VideoQueueItem[] = [];
  private isProcessingQueue = false;
  private currentUpload: VideoQueueItem | null = null;

  // Video constraints
  public readonly MAX_DURATION = 60; // seconds
  public readonly MIN_DURATION = 30; // seconds
  public readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  public readonly TARGET_BITRATE = 2000000; // 2 Mbps
  public readonly TARGET_FPS = 30;
  public readonly TARGET_RESOLUTION = { width: 1280, height: 720 };

  // Guidance phases for property walkthrough
  public readonly guidancePhases: VideoGuidancePhase[] = [
    {
      phase: 'exterior',
      title: 'Exterior Overview',
      duration: 15,
      instructions: [
        'Start with a wide shot of the property',
        'Slowly pan across the front facade',
        'Focus on roof, walls, and foundation',
        'Capture any visible exterior damage',
      ],
      tips: [
        'Keep camera steady',
        'Move slowly for better AI analysis',
        'Ensure good lighting',
      ],
    },
    {
      phase: 'interior',
      title: 'Interior Walkthrough',
      duration: 20,
      instructions: [
        'Walk through main living areas',
        'Point camera at ceilings and walls',
        'Focus on high-risk areas (bathrooms, kitchen)',
        'Capture plumbing and electrical fixtures',
      ],
      tips: [
        'Turn on all lights',
        'Open curtains for natural light',
        'Move systematically room by room',
      ],
    },
    {
      phase: 'damage_detail',
      title: 'Damage Details',
      duration: 20,
      instructions: [
        'Zoom in on any visible damage',
        'Hold camera steady for 3-5 seconds per area',
        'Capture different angles of damage',
        'Include context around damage areas',
      ],
      tips: [
        'Use flashlight for dark areas',
        'Get close but maintain focus',
        'Narrate what you see (audio helps AI)',
      ],
    },
    {
      phase: 'overview',
      title: 'Final Overview',
      duration: 5,
      instructions: [
        'Quick recap of main areas',
        'Any missed critical points',
        'Overall property condition shot',
      ],
      tips: ['Summarize key findings', 'End with exterior shot'],
    },
  ];

  private constructor() {
    this.initializeService();
  }

  static getInstance(): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService();
    }
    return VideoService.instance;
  }

  private async initializeService() {
    // Load queued videos from storage
    await this.loadQueue();

    // Set up network listener for offline queue processing
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });

    // FFmpeg removed for EAS build compatibility
    // Video compression disabled - videos uploaded at original quality
    logger.info('VideoService initialized (compression disabled)');
  }

  /**
   * Compress video - uses expo-image-picker quality setting at capture time.
   * No client-side re-encoding (would require react-native-compressor).
   * Returns original path with real file metadata from expo-file-system.
   */
  async compressVideo(
    inputPath: string,
    _outputPath: string,
    _options?: {
      maxDuration?: number;
      targetBitrate?: number;
      targetFps?: number;
      resolution?: { width: number; height: number };
    }
  ): Promise<{
    success: boolean;
    outputPath: string;
    metadata: VideoMetadata;
  }> {
    try {
      const metadata = await this.getVideoMetadata(inputPath);

      return {
        success: true,
        outputPath: inputPath,
        metadata,
      };
    } catch (error) {
      logger.error('Video compression error', { error });
      throw error;
    }
  }

  /**
   * Get video metadata using expo-file-system for real file size.
   * Width/height/duration come from ImagePickerAsset when available.
   */
  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(videoPath);
      const fileSize = (fileInfo as unknown as { size?: number }).size || 0;

      return {
        duration: 0,
        size: fileSize,
        width: 1280,
        height: 720,
        codec: 'h264',
        bitrate: 0,
        orientation: 'landscape',
      };
    } catch (error) {
      logger.error('Failed to get video metadata', { error });
      return {
        duration: 0,
        size: 0,
        width: 1280,
        height: 720,
        codec: 'h264',
        bitrate: 0,
        orientation: 'landscape',
      };
    }
  }

  /**
   * Build metadata from ImagePickerAsset (has width, height, duration, fileSize)
   */
  buildMetadataFromAsset(asset: {
    uri: string;
    width?: number;
    height?: number;
    duration?: number;
    fileSize?: number;
  }): VideoMetadata {
    const w = asset.width || 1280;
    const h = asset.height || 720;
    const duration = asset.duration ? asset.duration / 1000 : 0; // ms → s
    const size = asset.fileSize || 0;
    return {
      duration,
      size,
      width: w,
      height: h,
      codec: 'h264',
      bitrate: duration > 0 ? Math.round((size * 8) / duration) : 0,
      orientation: w >= h ? 'landscape' : 'portrait',
    };
  }

  /**
   * Upload video to the assessment endpoint.
   *
   * 2026-04-30 audit P0-3: callers MUST now pass either a real
   * assessmentId (uuid created via POST /api/assessments first) OR a
   * propertyId, not the placeholder string `'unknown'`. The server uses
   * one or the other to attach the video to a real row instead of
   * spawning an orphan assessment.
   */
  async uploadVideo(
    videoPath: string,
    options: {
      assessmentId?: string;
      propertyId?: string;
      // 2026-04-30 audit P1 follow-up: callers (the queue processor)
      // pass the local queue-item id so we can write a polling-key
      // mapping `video_assessment_${queueItemId} -> serverAssessmentId`
      // for `getProcessingResults(videoId)` lookups. Without this the
      // poller looked up `video_assessment_${queueItemId}` but we only
      // ever stored under `video_assessment_${serverAssessmentId}`.
      queueItemId?: string;
    },
    onProgress?: (progress: VideoUploadProgress) => void
  ): Promise<{ url: string; path: string; assessmentId: string }> {
    const { assessmentId, propertyId, queueItemId } = options;
    if (!assessmentId && !propertyId) {
      throw new Error(
        'uploadVideo requires assessmentId or propertyId — refusing to upload an orphan video'
      );
    }

    try {
      const videoData = await this.readVideoFile(videoPath);

      const idForFileName = assessmentId ?? propertyId ?? 'video';
      const fileName = `${idForFileName}_${Date.now()}.mp4`;
      const storagePath = assessmentId
        ? `assessments/${assessmentId}/videos/${fileName}`
        : `assessments/unlinked/${propertyId}/${fileName}`;

      logger.info('Uploading video via API', {
        storagePath,
        size: videoData.size,
        hasAssessmentId: !!assessmentId,
      });

      const formData = new FormData();
      formData.append('video', videoData, fileName);
      if (assessmentId) {
        formData.append('assessmentId', assessmentId);
      }
      if (propertyId) {
        formData.append('propertyId', propertyId);
      }

      const uploadResult = await mobileApiClient.postFormData<{
        success: boolean;
        assessmentId: string;
        videoUrl: string;
        status: string;
      }>(`/api/assessments/videos/upload`, formData);

      logger.info('Video uploaded successfully', {
        url: uploadResult.videoUrl,
        assessmentId: uploadResult.assessmentId,
      });

      // Persist the SERVER-issued assessmentId for status polling.
      // The poller (`getProcessingResults`) looks up by the local
      // queue-item id, NOT the server-issued id (callers don't see the
      // server id directly). 2026-04-30 audit P1 follow-up: write under
      // both keys so a future call from either side resolves. The
      // server id key is mostly defensive for replay/inspection.
      if (queueItemId) {
        await AsyncStorage.setItem(
          `video_assessment_${queueItemId}`,
          uploadResult.assessmentId
        );
      }
      await AsyncStorage.setItem(
        `video_assessment_${uploadResult.assessmentId}`,
        uploadResult.assessmentId
      );

      return {
        url: uploadResult.videoUrl,
        path: storagePath,
        assessmentId: uploadResult.assessmentId,
      };
    } catch (error) {
      logger.error('Video upload failed', { error });
      throw error;
    }
  }

  /**
   * Process video with SAM2
   */
  async processSAM2Video(
    videoUrl: string,
    damageTypes?: string[]
  ): Promise<string> {
    try {
      // Import the SAM2VideoService (would be copied from web version)
      const response = await fetch(
        `${this.getSAM2ServiceUrl()}/process-video-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_url: videoUrl,
            damage_types: damageTypes || [
              'water damage',
              'crack',
              'rot',
              'mold',
              'structural damage',
            ],
            extraction_fps: 2.0,
            confidence_threshold: 0.5,
            max_duration_seconds: 60,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('SAM2 processing failed');
      }

      const result = await response.json();
      return result.processing_id;
    } catch (error) {
      logger.error('SAM2 video processing failed', { error });
      throw error;
    }
  }

  /**
   * Get SAM2 processing status
   */
  async getSAM2ProcessingStatus(processingId: string): Promise<unknown> {
    try {
      const response = await fetch(
        `${this.getSAM2ServiceUrl()}/processing-status/${processingId}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get processing status');
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get SAM2 processing status', { error });
      throw error;
    }
  }

  /**
   * Queue video for processing (handles offline scenarios)
   */
  async queueVideo(
    videoPath: string,
    metadata: VideoMetadata,
    options?: {
      propertyId?: string;
      assessmentId?: string;
    }
  ): Promise<string> {
    const queueItem: VideoQueueItem = {
      id: `video_${Date.now()}`,
      videoPath,
      metadata,
      propertyId: options?.propertyId,
      assessmentId: options?.assessmentId,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    this.uploadQueue.push(queueItem);
    await this.saveQueue();

    // Check if online and process immediately
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      this.processQueue();
    }

    return queueItem.id;
  }

  /**
   * Process upload queue
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.uploadQueue.length > 0) {
        const item = this.uploadQueue[0];

        if (item?.status === 'failed' && item.retryCount >= 3) {
          // Move to failed items after max retries
          this.uploadQueue.shift();
          continue;
        }

        try {
          // Update status
          item!.status = 'uploading';
          this.currentUpload = item!;

          // Upload video — pass through whichever real id the queue
          // captured. Falling back to the literal string 'unknown' as
          // before created orphan storage paths AND made the server
          // mint a brand-new assessment row that nothing polled.
          if (!item!.assessmentId && !item!.propertyId) {
            logger.error('Queued video has no assessmentId or propertyId', {
              queueItemId: item!.id,
            });
            item!.status = 'failed';
            item!.error = 'Missing assessmentId/propertyId';
            this.uploadQueue.shift();
            continue;
          }

          const uploadOutcome = await this.uploadVideo(item!.videoPath, {
            assessmentId: item!.assessmentId,
            propertyId: item!.propertyId,
            queueItemId: item!.id,
          });
          // Pin the server-issued assessmentId back onto the queue item
          // so any retry/processing path uses the same row.
          item!.assessmentId = uploadOutcome.assessmentId;
          const { url } = uploadOutcome;

          // Process with SAM2
          item!.status = 'processing';
          const processingId = await this.processSAM2Video(url);

          // Wait for processing to complete
          let processingComplete = false;
          let attempts = 0;
          const maxAttempts = 60; // 2 minutes with 2-second intervals

          while (!processingComplete && attempts < maxAttempts) {
            const status = (await this.getSAM2ProcessingStatus(
              processingId
            )) as {
              status: string;
              result?: unknown;
              error?: string;
            };

            if (status.status === 'completed') {
              processingComplete = true;
              item!.status = 'completed';

              // Store results
              await this.storeProcessingResults(item!.id, status.result);
            } else if (status.status === 'failed') {
              throw new Error(status.error || 'Processing failed');
            }

            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }

          // Remove from queue on success
          this.uploadQueue.shift();
          this.currentUpload = null;
        } catch (error) {
          logger.error('Queue processing error', { error, item });
          item!.retryCount++;
          item!.status = 'failed';

          // Move to end of queue for retry
          this.uploadQueue.push(this.uploadQueue.shift()!);
        }
      }
    } finally {
      this.isProcessingQueue = false;
      await this.saveQueue();
    }
  }

  /**
   * Store processing results
   */
  private async storeProcessingResults(videoId: string, results: unknown) {
    try {
      await AsyncStorage.setItem(
        `video_results_${videoId}`,
        JSON.stringify(results)
      );

      // Also store in Supabase if needed
      // await supabase.from('video_assessments').insert({ ... });

      logger.info('Processing results stored', { videoId });
    } catch (error) {
      logger.error('Failed to store processing results', { error });
    }
  }

  /**
   * Get processing results
   */
  async getProcessingResults(videoId: string): Promise<unknown> {
    try {
      // First check if we have a server-side assessment ID linked to this video
      const serverAssessmentId = await AsyncStorage.getItem(
        `video_assessment_${videoId}`
      );

      if (serverAssessmentId) {
        // Poll server for AI assessment results
        const res = await mobileApiClient.get<{
          status: string;
          isComplete: boolean;
          isFailed: boolean;
          assessment: unknown;
        }>(`/api/assessments/${serverAssessmentId}/status`);

        if (res.isComplete && res.assessment) {
          return {
            aggregated_assessment: res.assessment,
            status: 'completed',
          };
        }
        if (res.isFailed) {
          return { status: 'failed', error: 'Assessment processing failed' };
        }
        // Still processing
        return null;
      }

      // Fallback: check local storage (legacy path)
      const results = await AsyncStorage.getItem(`video_results_${videoId}`);
      return results ? JSON.parse(results) : null;
    } catch (error) {
      logger.error('Failed to get processing results', { error });
      return null;
    }
  }

  /**
   * Load queue from storage
   */
  private async loadQueue() {
    try {
      const queueData = await AsyncStorage.getItem('video_upload_queue');
      if (queueData) {
        this.uploadQueue = JSON.parse(queueData);
      }
    } catch (error) {
      logger.error('Failed to load upload queue', { error });
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue() {
    try {
      await AsyncStorage.setItem(
        'video_upload_queue',
        JSON.stringify(this.uploadQueue)
      );
    } catch (error) {
      logger.error('Failed to save upload queue', { error });
    }
  }

  /**
   * Read a local video file URI into a Blob the upload route can ingest.
   *
   * 2026-04-30 audit P0-3: this previously returned `new Blob()` (empty),
   * which meant every video upload silently shipped a zero-byte file.
   * React Native's `fetch` polyfill supports `file://` URIs returned by
   * expo-image-picker / expo-camera, so we use it to materialize the
   * binary into a Blob. The platform check is gone — the path of least
   * surprise is "let fetch handle it".
   */
  private async readVideoFile(videoPath: string): Promise<Blob> {
    if (!videoPath) {
      throw new Error('Video path is required');
    }

    try {
      const response = await fetch(videoPath);
      if (!response.ok && response.status !== 0) {
        // status 0 is normal for file:// fetches on RN — only treat real
        // HTTP error codes as a failure.
        throw new Error(`Failed to read video (status ${response.status})`);
      }
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Read video file came back empty');
      }
      return blob;
    } catch (error) {
      logger.error('readVideoFile failed', { error, videoPath });
      throw error instanceof Error
        ? error
        : new Error('Failed to read video file');
    }
  }

  /**
   * Get SAM2 service URL.
   *
   * Uses EXPO_PUBLIC_ prefix so the value is bundled by Expo at build time.
   * The old env var (SAM2_VIDEO_SERVICE_URL without the prefix) was never
   * injected into the Expo bundle, silently falling back to localhost:8002
   * in production builds.
   *
   * Throws when the var is missing so callers can show a graceful
   * "SAM2 video analysis unavailable" message rather than silently
   * connecting to an unreachable localhost.
   */
  private getSAM2ServiceUrl(): string {
    const url = process.env.EXPO_PUBLIC_SAM2_VIDEO_SERVICE_URL;
    if (!url) {
      throw new Error(
        'SAM2 video analysis unavailable — EXPO_PUBLIC_SAM2_VIDEO_SERVICE_URL not configured'
      );
    }
    return url;
  }

  /**
   * Get upload queue status
   */
  getQueueStatus(): {
    pending: number;
    uploading: number;
    processing: number;
    completed: number;
    failed: number;
    current: VideoQueueItem | null;
  } {
    const status = {
      pending: 0,
      uploading: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      current: this.currentUpload,
    };

    this.uploadQueue.forEach((item) => {
      status[
        item.status === 'pending'
          ? 'pending'
          : item.status === 'uploading'
            ? 'uploading'
            : item.status === 'processing'
              ? 'processing'
              : item.status === 'completed'
                ? 'completed'
                : 'failed'
      ]++;
    });

    return status;
  }

  /**
   * Clear completed items from queue
   */
  async clearCompleted() {
    this.uploadQueue = this.uploadQueue.filter(
      (item) => item.status !== 'completed'
    );
    await this.saveQueue();
  }

  /**
   * Retry failed items
   */
  async retryFailed() {
    this.uploadQueue.forEach((item) => {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.retryCount = 0;
      }
    });
    await this.saveQueue();
    this.processQueue();
  }
}

export default VideoService.getInstance();

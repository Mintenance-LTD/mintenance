/**
 * Video Capture and Processing Service
 *
 * Singleton wrapper that owns the in-memory upload queue and
 * orchestrates the per-item lifecycle (upload → SAM2 process → poll →
 * persist). Refactored 2026-05-09: types, guidance data, SAM2 client,
 * upload helper, file utilities, and queue persistence extracted into
 * `video/upload/`. This file is now ~270 lines focused on the queue
 * + lifecycle orchestration.
 */

import { logger } from '@mintenance/shared';
import NetInfo from '@react-native-community/netinfo';

import { VIDEO_GUIDANCE_PHASES } from './video/upload/guidance';
import {
  buildMetadataFromAsset,
  getVideoMetadata,
} from './video/upload/file-utils';
import {
  getSam2ProcessingStatus,
  processSam2Video,
} from './video/upload/sam2-client';
import {
  uploadVideo as runUpload,
  type UploadVideoOptions,
  type UploadVideoResult,
} from './video/upload/upload';
import {
  getProcessingResults as readProcessingResults,
  loadQueue,
  saveQueue,
  storeProcessingResults,
} from './video/upload/queue-storage';
import {
  VIDEO_CONSTRAINTS,
  type VideoGuidancePhase,
  type VideoMetadata,
  type VideoQueueItem,
  type VideoUploadProgress,
} from './video/upload/types';

// Re-export types so existing imports `from '@/services/VideoService'`
// keep working without a sweep through every consumer.
export type {
  VideoGuidancePhase,
  VideoMetadata,
  VideoProcessingResult,
  VideoQueueItem,
  VideoUploadProgress,
} from './video/upload/types';

class VideoService {
  private static instance: VideoService;
  private uploadQueue: VideoQueueItem[] = [];
  private isProcessingQueue = false;
  private currentUpload: VideoQueueItem | null = null;

  public readonly MAX_DURATION = VIDEO_CONSTRAINTS.MAX_DURATION;
  public readonly MIN_DURATION = VIDEO_CONSTRAINTS.MIN_DURATION;
  public readonly MAX_FILE_SIZE = VIDEO_CONSTRAINTS.MAX_FILE_SIZE;
  public readonly TARGET_BITRATE = VIDEO_CONSTRAINTS.TARGET_BITRATE;
  public readonly TARGET_FPS = VIDEO_CONSTRAINTS.TARGET_FPS;
  public readonly TARGET_RESOLUTION = VIDEO_CONSTRAINTS.TARGET_RESOLUTION;
  public readonly guidancePhases: readonly VideoGuidancePhase[] =
    VIDEO_GUIDANCE_PHASES;

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
    this.uploadQueue = await loadQueue();

    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });

    // FFmpeg removed for EAS build compatibility — videos uploaded at
    // the quality set by expo-image-picker / expo-camera capture.
    logger.info('VideoService initialized (compression disabled)');
  }

  // -----------------------------------------------------------------
  // Public API — thin delegates
  // -----------------------------------------------------------------

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
      const metadata = await getVideoMetadata(inputPath);
      return { success: true, outputPath: inputPath, metadata };
    } catch (error) {
      logger.error('Video compression error', { error });
      throw error;
    }
  }

  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return getVideoMetadata(videoPath);
  }

  buildMetadataFromAsset(
    asset: Parameters<typeof buildMetadataFromAsset>[0]
  ): VideoMetadata {
    return buildMetadataFromAsset(asset);
  }

  async uploadVideo(
    videoPath: string,
    options: UploadVideoOptions,
    onProgress?: (progress: VideoUploadProgress) => void
  ): Promise<UploadVideoResult> {
    return runUpload(videoPath, options, onProgress);
  }

  async processSAM2Video(
    videoUrl: string,
    damageTypes?: string[]
  ): Promise<string> {
    return processSam2Video(videoUrl, damageTypes);
  }

  async getSAM2ProcessingStatus(processingId: string): Promise<unknown> {
    return getSam2ProcessingStatus(processingId);
  }

  async getProcessingResults(videoId: string): Promise<unknown> {
    return readProcessingResults(videoId);
  }

  // -----------------------------------------------------------------
  // Queue lifecycle — owned by the singleton because it mutates state
  // -----------------------------------------------------------------

  async queueVideo(
    videoPath: string,
    metadata: VideoMetadata,
    options?: { propertyId?: string; assessmentId?: string }
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
    await saveQueue(this.uploadQueue);

    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      this.processQueue();
    }

    return queueItem.id;
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.uploadQueue.length > 0) {
        const item = this.uploadQueue[0];

        if (item?.status === 'failed' && item.retryCount >= 3) {
          this.uploadQueue.shift();
          continue;
        }

        try {
          item!.status = 'uploading';
          this.currentUpload = item!;

          if (!item!.assessmentId && !item!.propertyId) {
            logger.error('Queued video has no assessmentId or propertyId', {
              queueItemId: item!.id,
            });
            item!.status = 'failed';
            item!.error = 'Missing assessmentId/propertyId';
            this.uploadQueue.shift();
            continue;
          }

          const uploadOutcome = await runUpload(item!.videoPath, {
            assessmentId: item!.assessmentId,
            propertyId: item!.propertyId,
            queueItemId: item!.id,
          });
          // Pin server-issued assessmentId so retries reuse the same row.
          item!.assessmentId = uploadOutcome.assessmentId;
          const { url } = uploadOutcome;

          item!.status = 'processing';
          const processingId = await processSam2Video(url);

          let processingComplete = false;
          let attempts = 0;
          const maxAttempts = 60; // 2 min @ 2-second intervals

          while (!processingComplete && attempts < maxAttempts) {
            const status = (await getSam2ProcessingStatus(processingId)) as {
              status: string;
              result?: unknown;
              error?: string;
            };

            if (status.status === 'completed') {
              processingComplete = true;
              item!.status = 'completed';
              await storeProcessingResults(item!.id, status.result);
            } else if (status.status === 'failed') {
              throw new Error(status.error || 'Processing failed');
            }

            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }

          this.uploadQueue.shift();
          this.currentUpload = null;
        } catch (error) {
          logger.error('Queue processing error', { error, item });
          item!.retryCount++;
          item!.status = 'failed';
          this.uploadQueue.push(this.uploadQueue.shift()!);
        }
      }
    } finally {
      this.isProcessingQueue = false;
      await saveQueue(this.uploadQueue);
    }
  }

  // -----------------------------------------------------------------
  // Queue introspection / management
  // -----------------------------------------------------------------

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
      status[item.status]++;
    });

    return status;
  }

  async clearCompleted() {
    this.uploadQueue = this.uploadQueue.filter(
      (item) => item.status !== 'completed'
    );
    await saveQueue(this.uploadQueue);
  }

  async retryFailed() {
    this.uploadQueue.forEach((item) => {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.retryCount = 0;
      }
    });
    await saveQueue(this.uploadQueue);
    this.processQueue();
  }
}

export default VideoService.getInstance();

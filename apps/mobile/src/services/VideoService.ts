/**
 * Video Capture and Processing Service
 * Handles video capture, compression, upload, and SAM2 integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FFmpegKit, FFmpegKitConfig, ReturnCode } from 'react-native-ffmpeg-kit';
import { logger } from '@mintenance/shared';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabase';

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
        'Capture any visible exterior damage'
      ],
      tips: [
        'Keep camera steady',
        'Move slowly for better AI analysis',
        'Ensure good lighting'
      ]
    },
    {
      phase: 'interior',
      title: 'Interior Walkthrough',
      duration: 20,
      instructions: [
        'Walk through main living areas',
        'Point camera at ceilings and walls',
        'Focus on high-risk areas (bathrooms, kitchen)',
        'Capture plumbing and electrical fixtures'
      ],
      tips: [
        'Turn on all lights',
        'Open curtains for natural light',
        'Move systematically room by room'
      ]
    },
    {
      phase: 'damage_detail',
      title: 'Damage Details',
      duration: 20,
      instructions: [
        'Zoom in on any visible damage',
        'Hold camera steady for 3-5 seconds per area',
        'Capture different angles of damage',
        'Include context around damage areas'
      ],
      tips: [
        'Use flashlight for dark areas',
        'Get close but maintain focus',
        'Narrate what you see (audio helps AI)'
      ]
    },
    {
      phase: 'overview',
      title: 'Final Overview',
      duration: 5,
      instructions: [
        'Quick recap of main areas',
        'Any missed critical points',
        'Overall property condition shot'
      ],
      tips: [
        'Summarize key findings',
        'End with exterior shot'
      ]
    }
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
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });

    // Configure FFmpeg
    FFmpegKitConfig.enableLogCallback(log => {
      logger.debug('FFmpeg log:', { message: log.getMessage() });
    });
  }

  /**
   * Compress video using FFmpeg
   */
  async compressVideo(
    inputPath: string,
    outputPath: string,
    options?: {
      maxDuration?: number;
      targetBitrate?: number;
      targetFps?: number;
      resolution?: { width: number; height: number };
    }
  ): Promise<{ success: boolean; outputPath: string; metadata: VideoMetadata }> {
    const maxDuration = options?.maxDuration || this.MAX_DURATION;
    const targetBitrate = options?.targetBitrate || this.TARGET_BITRATE;
    const targetFps = options?.targetFps || this.TARGET_FPS;
    const resolution = options?.resolution || this.TARGET_RESOLUTION;

    // Build FFmpeg command
    const commands = [
      `-i "${inputPath}"`,
      `-t ${maxDuration}`, // Limit duration
      `-vf "scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2"`,
      `-c:v h264`, // H.264 codec
      `-preset fast`,
      `-crf 23`, // Quality (lower is better, 23 is good balance)
      `-b:v ${targetBitrate}`, // Target bitrate
      `-r ${targetFps}`, // Frame rate
      `-c:a aac`, // Audio codec
      `-b:a 128k`, // Audio bitrate
      `-movflags +faststart`, // Optimize for streaming
      `-y`, // Overwrite output
      `"${outputPath}"`
    ];

    const command = commands.join(' ');

    logger.info('Compressing video', { inputPath, outputPath, command });

    try {
      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCode)) {
        // Get metadata of compressed video
        const metadata = await this.getVideoMetadata(outputPath);

        logger.info('Video compression successful', {
          inputPath,
          outputPath,
          originalSize: metadata.size,
          compressedSize: metadata.size
        });

        return {
          success: true,
          outputPath,
          metadata
        };
      } else {
        const output = await session.getOutput();
        logger.error('Video compression failed', { returnCode, output });
        return {
          success: false,
          outputPath: '',
          metadata: {} as VideoMetadata
        };
      }
    } catch (error) {
      logger.error('Video compression error', { error });
      throw error;
    }
  }

  /**
   * Get video metadata using FFmpeg
   */
  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    const command = `-i "${videoPath}" -hide_banner -show_format -show_streams -print_format json`;

    try {
      const session = await FFmpegKit.execute(command);
      const output = await session.getOutput();

      // Parse FFmpeg output (simplified - real implementation would parse JSON)
      const metadata: VideoMetadata = {
        duration: 0,
        size: 0,
        width: 1280,
        height: 720,
        codec: 'h264',
        bitrate: 2000000,
        orientation: 'landscape'
      };

      // Extract actual values from output
      // This is simplified - real implementation would parse the JSON output
      const durationMatch = output.match(/duration=(\d+\.?\d*)/);
      if (durationMatch) {
        metadata.duration = parseFloat(durationMatch[1]);
      }

      return metadata;
    } catch (error) {
      logger.error('Failed to get video metadata', { error });
      throw error;
    }
  }

  /**
   * Upload video to Supabase storage
   */
  async uploadVideo(
    videoPath: string,
    assessmentId: string,
    onProgress?: (progress: VideoUploadProgress) => void
  ): Promise<{ url: string; path: string }> {
    try {
      // Read video file
      const videoData = await this.readVideoFile(videoPath);

      const fileName = `${assessmentId}_${Date.now()}.mp4`;
      const storagePath = `assessments/${assessmentId}/videos/${fileName}`;

      logger.info('Uploading video to Supabase', { storagePath, size: videoData.size });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('assessment-videos')
        .upload(storagePath, videoData, {
          contentType: 'video/mp4',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('assessment-videos')
        .getPublicUrl(storagePath);

      logger.info('Video uploaded successfully', { url: publicData.publicUrl });

      return {
        url: publicData.publicUrl,
        path: storagePath
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
      const response = await fetch(`${this.getSAM2ServiceUrl()}/process-video-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: videoUrl,
          damage_types: damageTypes || ['water damage', 'crack', 'rot', 'mold', 'structural damage'],
          extraction_fps: 2.0,
          confidence_threshold: 0.5,
          max_duration_seconds: 60,
        }),
      });

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
      status: 'pending'
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

        if (item.status === 'failed' && item.retryCount >= 3) {
          // Move to failed items after max retries
          this.uploadQueue.shift();
          continue;
        }

        try {
          // Update status
          item.status = 'uploading';
          this.currentUpload = item;

          // Upload video
          const { url } = await this.uploadVideo(
            item.videoPath,
            item.assessmentId || 'unknown'
          );

          // Process with SAM2
          item.status = 'processing';
          const processingId = await this.processSAM2Video(url);

          // Wait for processing to complete
          let processingComplete = false;
          let attempts = 0;
          const maxAttempts = 60; // 2 minutes with 2-second intervals

          while (!processingComplete && attempts < maxAttempts) {
            const status = await this.getSAM2ProcessingStatus(processingId);

            if (status.status === 'completed') {
              processingComplete = true;
              item.status = 'completed';

              // Store results
              await this.storeProcessingResults(item.id, status.result);
            } else if (status.status === 'failed') {
              throw new Error(status.error || 'Processing failed');
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // Remove from queue on success
          this.uploadQueue.shift();
          this.currentUpload = null;

        } catch (error) {
          logger.error('Queue processing error', { error, item });
          item.retryCount++;
          item.status = 'failed';

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
   * Read video file (platform-specific implementation)
   */
  private async readVideoFile(videoPath: string): Promise<Blob> {
    // Platform-specific file reading
    // This would use react-native-fs or similar
    if (Platform.OS === 'ios') {
      // iOS implementation
    } else {
      // Android implementation
    }

    // Placeholder - actual implementation would read file
    return new Blob();
  }

  /**
   * Get SAM2 service URL
   */
  private getSAM2ServiceUrl(): string {
    // In production, this would come from environment config
    return process.env.SAM2_VIDEO_SERVICE_URL || 'http://localhost:8002';
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
      current: this.currentUpload
    };

    this.uploadQueue.forEach(item => {
      status[item.status === 'pending' ? 'pending' :
             item.status === 'uploading' ? 'uploading' :
             item.status === 'processing' ? 'processing' :
             item.status === 'completed' ? 'completed' : 'failed']++;
    });

    return status;
  }

  /**
   * Clear completed items from queue
   */
  async clearCompleted() {
    this.uploadQueue = this.uploadQueue.filter(item => item.status !== 'completed');
    await this.saveQueue();
  }

  /**
   * Retry failed items
   */
  async retryFailed() {
    this.uploadQueue.forEach(item => {
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
/**
 * Video Capture Service — recording guidance + metadata helpers.
 *
 * The SAM2 upload/queue/fusion pipeline was retired in favour of the VLM
 * walkthrough (see KeyframeWalkthroughService), so this is now just the
 * recording-guidance phases, duration/size constants, and metadata helpers
 * used by VideoCaptureScreen.
 */

import { logger } from '@mintenance/shared';

import { VIDEO_GUIDANCE_PHASES } from './video/upload/guidance';
import {
  buildMetadataFromAsset,
  getVideoMetadata,
} from './video/upload/file-utils';
import {
  VIDEO_CONSTRAINTS,
  type VideoGuidancePhase,
  type VideoMetadata,
} from './video/upload/types';

// Re-export types so existing imports `from '@/services/VideoService'` keep
// working without a sweep through every consumer.
export type { VideoGuidancePhase, VideoMetadata } from './video/upload/types';

class VideoService {
  private static instance: VideoService;

  public readonly MAX_DURATION = VIDEO_CONSTRAINTS.MAX_DURATION;
  public readonly MIN_DURATION = VIDEO_CONSTRAINTS.MIN_DURATION;
  public readonly MAX_FILE_SIZE = VIDEO_CONSTRAINTS.MAX_FILE_SIZE;
  public readonly TARGET_BITRATE = VIDEO_CONSTRAINTS.TARGET_BITRATE;
  public readonly TARGET_FPS = VIDEO_CONSTRAINTS.TARGET_FPS;
  public readonly TARGET_RESOLUTION = VIDEO_CONSTRAINTS.TARGET_RESOLUTION;
  public readonly guidancePhases: readonly VideoGuidancePhase[] =
    VIDEO_GUIDANCE_PHASES;

  static getInstance(): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService();
    }
    return VideoService.instance;
  }

  /**
   * No transcoding (FFmpeg was removed for EAS build compatibility) — this
   * just reads the captured clip's metadata. Kept for the capture screen's
   * pre-flight validation.
   */
  async compressVideo(
    inputPath: string,
    _outputPath?: string
  ): Promise<{
    success: boolean;
    outputPath: string;
    metadata: VideoMetadata;
  }> {
    try {
      const metadata = await getVideoMetadata(inputPath);
      return { success: true, outputPath: inputPath, metadata };
    } catch (error) {
      logger.error('Video metadata read error', { error });
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
}

export default VideoService.getInstance();

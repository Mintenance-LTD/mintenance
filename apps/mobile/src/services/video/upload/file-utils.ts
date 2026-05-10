import * as FileSystem from 'expo-file-system';
import { logger } from '@mintenance/shared';
import type { VideoMetadata } from './types';

/**
 * File-level helpers for the video upload pipeline. Extracted from
 * VideoService.ts on 2026-05-09.
 *
 * The "compress" function is a no-op since FFmpeg was removed for EAS
 * compatibility — videos are captured at the desired quality via
 * expo-image-picker's `quality` option, then uploaded as-is.
 */

/**
 * Read file metadata via expo-file-system. Returns conservative
 * defaults for resolution/duration when the underlying API doesn't
 * surface them — callers that have the original ImagePickerAsset
 * should prefer `buildMetadataFromAsset` for richer data.
 */
export async function getVideoMetadata(
  videoPath: string
): Promise<VideoMetadata> {
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
 * Build metadata from an `ImagePickerAsset`-shaped object. Used at
 * capture time — has real width/height/duration/fileSize from the
 * picker, so the metadata is more accurate than `getVideoMetadata`.
 */
export function buildMetadataFromAsset(asset: {
  uri: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
}): VideoMetadata {
  const w = asset.width || 1280;
  const h = asset.height || 720;
  const duration = asset.duration ? asset.duration / 1000 : 0;
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
 * Read a local video file URI into a Blob the upload route can ingest.
 *
 * 2026-04-30 audit P0-3: this previously returned `new Blob()` (empty),
 * which meant every video upload silently shipped a zero-byte file.
 * React Native's `fetch` polyfill supports `file://` URIs returned by
 * expo-image-picker / expo-camera, so we use it to materialize the
 * binary into a Blob.
 *
 * Note: status 0 is normal for `file://` fetches on RN — only treat
 * real HTTP error codes as a failure.
 */
export async function readVideoFile(videoPath: string): Promise<Blob> {
  if (!videoPath) {
    throw new Error('Video path is required');
  }

  try {
    const response = await fetch(videoPath);
    if (!response.ok && response.status !== 0) {
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

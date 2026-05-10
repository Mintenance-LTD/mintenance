import { logger } from '@mintenance/shared';

/**
 * SAM2 video-processing client. Extracted from VideoService.ts on
 * 2026-05-09. Talks to the SAM2 service via the
 * EXPO_PUBLIC_SAM2_VIDEO_SERVICE_URL env var (must have the
 * EXPO_PUBLIC_ prefix or it doesn't get bundled into the binary).
 */

const DEFAULT_DAMAGE_TYPES = [
  'water damage',
  'crack',
  'rot',
  'mold',
  'structural damage',
];

export function getSam2ServiceUrl(): string {
  const url = process.env.EXPO_PUBLIC_SAM2_VIDEO_SERVICE_URL;
  if (!url) {
    throw new Error(
      'SAM2 video analysis unavailable — EXPO_PUBLIC_SAM2_VIDEO_SERVICE_URL not configured'
    );
  }
  return url;
}

/**
 * Submit a video URL for SAM2 processing. Returns the processing-id
 * the caller polls via `getSam2ProcessingStatus`.
 */
export async function processSam2Video(
  videoUrl: string,
  damageTypes?: string[]
): Promise<string> {
  try {
    const response = await fetch(`${getSam2ServiceUrl()}/process-video-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: videoUrl,
        damage_types: damageTypes ?? DEFAULT_DAMAGE_TYPES,
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
 * Poll the SAM2 service for the current status of a submitted job.
 * Returns the raw response so callers can inspect status, errors,
 * and the eventual result payload.
 */
export async function getSam2ProcessingStatus(
  processingId: string
): Promise<unknown> {
  try {
    const response = await fetch(
      `${getSam2ServiceUrl()}/processing-status/${processingId}`,
      { method: 'GET' }
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

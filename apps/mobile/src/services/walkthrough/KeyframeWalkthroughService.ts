/**
 * VLM-native video walkthrough (mobile side, Phase C).
 *
 * Replaces the SAM2 video pipeline: instead of uploading the whole video for
 * server-side SAM2 tracking, the phone extracts keyframes on-device, uploads
 * them as images, and posts the frame URLs to POST /api/assessments/walkthrough.
 * The server runs each frame through the building-surveyor VLM and merges the
 * per-frame findings into one property survey — the same assistant that powers
 * the photo assessment, now reading a whole walk.
 *
 * No native SAM2 dependency, no service URL in the bundle.
 */
import { logger } from '@mintenance/shared';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';

/** Server caps a walkthrough at 20 frames; we stay well under for cost + time. */
export const MAX_WALKTHROUGH_FRAMES = 12;
export const MIN_WALKTHROUGH_FRAMES = 2;
/** Roughly one keyframe every ~4s of footage, clamped to [MIN, MAX]. */
const SECONDS_PER_FRAME = 4;
/** A walkthrough is N vision calls server-side — give it real headroom. */
const WALKTHROUGH_TIMEOUT_MS = 240_000;

const EXT_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export interface WalkthroughContext {
  propertyType?: string;
  location?: string;
  ageOfProperty?: number;
}

export interface WalkthroughRunResult {
  assessmentId: string;
  frameCount: number;
  framesAssessed: number;
  assessment: Record<string, unknown>;
}

/**
 * Evenly-spaced sample timestamps (ms) across the clip, biased away from the
 * very first/last frames (often blurred by the start/stop motion). Pure +
 * deterministic so it can be unit-tested without a real video.
 */
export function frameTimestampsMs(durationMs: number, count: number): number[] {
  const n = Math.max(1, Math.floor(count));
  if (durationMs <= 0) return new Array(n).fill(0);
  // Sample at the midpoints of n equal segments: (i + 0.5)/n of the duration.
  // This keeps the first/last samples off the absolute ends without dropping
  // coverage of the clip's body.
  return Array.from({ length: n }, (_, i) =>
    Math.round(((i + 0.5) / n) * durationMs)
  );
}

/** How many keyframes to pull for a clip of the given length. */
export function frameCountForDuration(durationMs: number): number {
  const bySeconds = Math.round(durationMs / 1000 / SECONDS_PER_FRAME);
  return Math.min(
    MAX_WALKTHROUGH_FRAMES,
    Math.max(MIN_WALKTHROUGH_FRAMES, bySeconds)
  );
}

/**
 * Extract keyframes from a local video URI. Frames that fail to render are
 * skipped (a single bad timestamp must not sink the walk); the surviving
 * frames are returned in capture order.
 */
export async function extractKeyframes(
  videoUri: string,
  durationMs: number,
  count: number
): Promise<string[]> {
  const timestamps = frameTimestampsMs(durationMs, count);
  const uris: string[] = [];
  for (const time of timestamps) {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time,
        quality: 0.7,
      });
      uris.push(uri);
    } catch (err) {
      logger.warn('Keyframe extraction failed (skipped)', {
        service: 'KeyframeWalkthroughService',
        time,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return uris;
}

/** Upload local keyframe URIs to the public assessment-photos bucket. */
async function uploadFrames(
  frameUris: string[],
  folderId: string
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < frameUris.length; i++) {
    try {
      const uri = frameUris[i]!;
      const filePath = `walkthroughs/${folderId}/${i}.jpg`;
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error } = await supabase.storage
        .from('assessment-photos')
        .upload(filePath, arrayBuffer, {
          contentType: EXT_CONTENT_TYPES.jpg,
          upsert: true,
        });
      if (error) {
        logger.warn('Keyframe upload failed', {
          service: 'KeyframeWalkthroughService',
          index: i,
          error: error.message,
        });
        continue;
      }
      const { data } = supabase.storage
        .from('assessment-photos')
        .getPublicUrl(filePath);
      urls.push(data.publicUrl);
    } catch (err) {
      logger.warn('Keyframe upload error', {
        service: 'KeyframeWalkthroughService',
        index: i,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return urls;
}

/**
 * Run the full on-device walkthrough: extract keyframes → upload → POST to the
 * VLM walkthrough route → return the merged property survey. Anchors on a real
 * propertyId or assessmentId (the route refuses an orphan).
 */
export async function runWalkthrough(params: {
  videoUri: string;
  durationMs: number;
  propertyId?: string;
  jobId?: string;
  context?: WalkthroughContext;
}): Promise<WalkthroughRunResult> {
  const { videoUri, durationMs, propertyId, jobId, context } = params;
  if (!propertyId && !jobId) {
    throw new Error('runWalkthrough requires a propertyId or jobId anchor');
  }

  const count = frameCountForDuration(durationMs);
  const frameUris = await extractKeyframes(videoUri, durationMs, count);
  if (frameUris.length < MIN_WALKTHROUGH_FRAMES) {
    throw new Error(
      'Could not extract enough keyframes from the video. Please re-record a steadier walkthrough.'
    );
  }

  const folderId = `${propertyId ?? jobId}-${Date.now()}`;
  const frameUrls = await uploadFrames(frameUris, folderId);
  if (frameUrls.length < MIN_WALKTHROUGH_FRAMES) {
    throw new Error('Failed to upload walkthrough frames. Please try again.');
  }

  logger.info('Posting walkthrough frames for assessment', {
    service: 'KeyframeWalkthroughService',
    frameCount: frameUrls.length,
    propertyId,
    jobId,
  });

  const result = await mobileApiClient.post<WalkthroughRunResult>(
    '/api/assessments/walkthrough',
    {
      frameUrls,
      ...(propertyId ? { propertyId } : {}),
      ...(jobId ? { jobId } : {}),
      ...(context ? { context } : {}),
    },
    { timeout: WALKTHROUGH_TIMEOUT_MS }
  );

  if (!result?.assessmentId) {
    throw new Error('Walkthrough assessment returned no result');
  }
  return result;
}

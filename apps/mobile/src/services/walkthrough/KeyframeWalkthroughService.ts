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
import { mobileApiClient } from '../../utils/mobileApiClient';

/** Server caps a walkthrough at 20 frames; we stay well under for cost + time. */
export const MAX_WALKTHROUGH_FRAMES = 12;
export const MIN_WALKTHROUGH_FRAMES = 2;
/** Roughly one keyframe every ~4s of footage, clamped to [MIN, MAX]. */
const SECONDS_PER_FRAME = 4;
/** A walkthrough is N vision calls server-side — give it real headroom. */
const WALKTHROUGH_TIMEOUT_MS = 240_000;

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
  // Lazy-load the native module: importing it at startup would evaluate
  // requireNativeModule() during app launch, so any autolink/binary hiccup
  // would crash the whole app instead of just degrading this one feature.
  const VideoThumbnails = await import('expo-video-thumbnails');
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

/**
 * Run the full on-device walkthrough: extract keyframes → POST the frame IMAGES
 * as multipart to the walkthrough route → return the merged property survey.
 *
 * The frames are sent as files over the proven Bearer-authed API; the SERVER
 * uploads them to storage with the service role. Client-side direct-to-storage
 * uploads from React Native never landed bytes, so all upload now lives
 * server-side. Anchors on a real propertyId or jobId (the route refuses an
 * orphan).
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

  const form = new FormData();
  frameUris.forEach((uri, i) => {
    // React Native file part — a {uri,name,type} object is how RN streams a
    // local file through multipart without reading the bytes in JS (the read
    // path that was unreliable on Hermes).
    form.append('frames', {
      uri,
      name: `${i}.jpg`,
      type: 'image/jpeg',
    } as unknown as Blob);
  });
  if (propertyId) form.append('propertyId', propertyId);
  if (jobId) form.append('jobId', jobId);
  form.append('domain', 'building');
  if (context) form.append('context', JSON.stringify(context));

  logger.info('Posting walkthrough frames for assessment', {
    service: 'KeyframeWalkthroughService',
    frameCount: frameUris.length,
    propertyId,
    jobId,
  });

  const result = await mobileApiClient.postFormData<WalkthroughRunResult>(
    '/api/assessments/walkthrough',
    form,
    WALKTHROUGH_TIMEOUT_MS
  );

  if (!result?.assessmentId) {
    throw new Error('Walkthrough assessment returned no result');
  }
  return result;
}

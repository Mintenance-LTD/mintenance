/**
 * YOLO Image Preprocessing Utilities
 *
 * Handles image preprocessing for YOLO model inference:
 * - Image download/loading
 * - Resize to model input size (640x640)
 * - Normalize pixel values (0-255 → 0-1)
 * - Convert to tensor format (NCHW: [batch, channels, height, width])
 */

import sharp from 'sharp';
import { logger } from '@mintenance/shared';
import { safeFetch, SafeFetchError } from '@/lib/security/safe-fetch';

export interface PreprocessedImage {
  /** Preprocessed image tensor [1, 3, 640, 640] */
  tensor: Float32Array;
  /** Original image dimensions */
  originalWidth: number;
  originalHeight: number;
  /** Scale factors for bounding box conversion */
  scaleX: number;
  scaleY: number;
}

/**
 * YOLO model input size (standard for YOLOv11)
 */
const MODEL_INPUT_SIZE = 640;

/**
 * Download and preprocess image for YOLO inference.
 *
 * @param imageUrl - HTTPS URL to image. Must be in the validateURL
 *   allowlist (defaults to *.supabase.co / *.supabase.in). Filesystem
 *   paths are NOT supported — the previous `fs.readFile(imageUrl)`
 *   branch was an LFI gadget and was removed in the 2026-05-24 audit.
 * @returns Preprocessed image tensor and metadata
 */
export async function preprocessImageForYOLO(
  imageUrl: string
): Promise<PreprocessedImage> {
  try {
    // Download or read image
    const imageBuffer = await downloadImage(imageUrl);

    // Get original dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || MODEL_INPUT_SIZE;
    const originalHeight = metadata.height || MODEL_INPUT_SIZE;

    // Resize to model input size (640x640) with letterbox padding (maintains aspect ratio)
    const resizedBuffer = await sharp(imageBuffer)
      .resize(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, {
        fit: 'contain',
        background: { r: 114, g: 114, b: 114 }, // YOLO standard padding color
      })
      .raw()
      .toBuffer();

    // Convert to RGB array and normalize (0-255 → 0-1)
    const pixels = new Uint8Array(resizedBuffer);
    const tensor = new Float32Array(
      1 * 3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE
    );

    // Convert from HWC to CHW format and normalize
    for (let h = 0; h < MODEL_INPUT_SIZE; h++) {
      for (let w = 0; w < MODEL_INPUT_SIZE; w++) {
        const pixelIndex = (h * MODEL_INPUT_SIZE + w) * 3;
        const r = pixels[pixelIndex] / 255.0;
        const g = pixels[pixelIndex + 1] / 255.0;
        const b = pixels[pixelIndex + 2] / 255.0;

        // CHW format: [channel][height][width]
        tensor[
          0 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + h * MODEL_INPUT_SIZE + w
        ] = r;
        tensor[
          1 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + h * MODEL_INPUT_SIZE + w
        ] = g;
        tensor[
          2 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + h * MODEL_INPUT_SIZE + w
        ] = b;
      }
    }

    // Calculate scale factors for bounding box conversion
    const scaleX = originalWidth / MODEL_INPUT_SIZE;
    const scaleY = originalHeight / MODEL_INPUT_SIZE;

    return {
      tensor,
      originalWidth,
      originalHeight,
      scaleX,
      scaleY,
    };
  } catch (error) {
    logger.error('Failed to preprocess image for YOLO', {
      service: 'YOLOPreprocessing',
      imageUrl,
      error,
    });
    throw new Error(
      `Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Download image from a validated remote URL.
 *
 * Audit 2026-05-24 HIGH: previously this function had two attack surfaces:
 *   1. An unbounded `fetch(imageUrl)` with no DNS check, no size cap, no
 *      content-type check — classic SSRF.
 *   2. A `fs.readFile(imageUrl)` fallback for non-HTTP inputs — a
 *      straight LFI gadget the moment any user-influenced string reached
 *      this function.
 *
 * Both are now routed through `safeFetch` which validates the URL against
 * the allowlist, resolves DNS to ensure the host is not in private space,
 * caps the response size, and enforces an image/* content-type.
 */
async function downloadImage(imageUrl: string): Promise<Buffer> {
  if (!imageUrl.startsWith('https://') && !imageUrl.startsWith('http://')) {
    throw new SafeFetchError(
      'INVALID_URL',
      'YOLO preprocessing requires an http(s) URL; filesystem paths are not supported'
    );
  }
  const { buffer } = await safeFetch(imageUrl, {
    // 25 MB default already covers Supabase-stored property photos
    // (typical 1-5 MB) with headroom; raise per-call if a training run
    // legitimately needs more.
    allowedContentTypes: ['image/'],
  });
  return buffer;
}

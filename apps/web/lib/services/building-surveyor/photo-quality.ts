import sharp from 'sharp';

import type { PhotoQualityIssue } from './recapture-guidance';
export interface PhotoQualityResult {
  width: number;
  height: number;
  issue: PhotoQualityIssue | null;
  lowDetailWarning: boolean;
  softFocusWarning: boolean;
  laplacianVariance: number;
}

/** Conservative capture checks, not a defect detector or proof of assessability. */
export async function inspectPhotoQuality(
  bytes: Buffer
): Promise<PhotoQualityResult> {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw new Error('Invalid photo size');
  const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'error' });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1)
    throw new Error('Unsupported photo');
  const { data, info } = await image
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let dark = 0,
    bright = 0,
    sum = 0,
    sumSq = 0;
  for (const pixel of data) {
    if (pixel <= 8) dark++;
    if (pixel >= 247) bright++;
    sum += pixel;
    sumSq += pixel * pixel;
  }
  const variance = sumSq / data.length - (sum / data.length) ** 2;
  let edgeSum = 0,
    edgeSumSq = 0,
    count = 0;
  for (let y = 1; y < info.height - 1; y++)
    for (let x = 1; x < info.width - 1; x++) {
      const i = y * info.width + x;
      const edge =
        data[i - 1] +
        data[i + 1] +
        data[i - info.width] +
        data[i + info.width] -
        4 * data[i];
      edgeSum += edge;
      edgeSumSq += edge * edge;
      count++;
    }
  const laplacianVariance = count
    ? Math.max(0, edgeSumSq / count - (edgeSum / count) ** 2)
    : 0;
  const issue =
    Math.min(metadata.width, metadata.height) < 128
      ? 'too_small'
      : dark / data.length >= 0.98
        ? 'too_dark'
        : bright / data.length >= 0.98
          ? 'overexposed'
          : null;
  // Smooth intact surfaces also have low detail; never reject on this alone.
  return {
    width: metadata.width,
    height: metadata.height,
    issue,
    lowDetailWarning: variance < 16,
    // Provisional diagnostic, not a recapture gate: shadows/gradients can also be smooth.
    softFocusWarning:
      !issue && variance >= 16 && laplacianVariance / variance < 0.02,
    laplacianVariance,
  };
}

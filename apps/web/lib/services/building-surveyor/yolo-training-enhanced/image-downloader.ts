/**
 * Image downloader for YOLO training data.
 *
 * Audit 2026-05-24 HIGH: previously called `node-fetch(url)` with no
 * DNS-resolved private-IP check, no size cap, no content-type allowlist.
 * The "is this a Supabase storage URL?" branch was dead code — both
 * branches did the same fetch + pipeline. Now routes through `safeFetch`
 * which centralises the SSRF guards.
 */

import { writeFile } from 'node:fs/promises';
import { logger } from '@mintenance/shared';
import { safeFetch } from '@/lib/security/safe-fetch';

const SERVICE = 'YOLOTrainingDataEnhanced';

/**
 * Download an image from a validated URL into `outputPath`.
 *
 * Caller (`YOLOTrainingDataEnhanced.materializeCorrections`) already
 * wraps the call in try/catch and skips failed images, so we propagate
 * the underlying `SafeFetchError` rather than smothering it.
 */
export async function downloadImage(
  url: string,
  outputPath: string
): Promise<void> {
  const { buffer, size, contentType } = await safeFetch(url, {
    // Training imagery only — never video/PDF.
    allowedContentTypes: ['image/'],
    // Allow somewhat larger payloads than the inference path: training
    // corpora occasionally include higher-res reference photos.
    maxBytes: 50 * 1024 * 1024,
  });

  await writeFile(outputPath, buffer);

  logger.info('Downloaded training image', {
    service: SERVICE,
    url,
    outputPath,
    bytes: size,
    contentType,
  });
}

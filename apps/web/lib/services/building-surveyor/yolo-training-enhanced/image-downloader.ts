/**
 * Image downloader for YOLO training data
 */

import { logger } from '@mintenance/shared';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';

const SERVICE = 'YOLOTrainingDataEnhanced';

/**
 * Download an image from a URL
 */
export async function downloadImage(url: string, outputPath: string): Promise<void> {
  try {
    // Handle Supabase storage URLs
    if (url.includes('supabase.co/storage')) {
      // If it's a private bucket, we might need to add auth headers
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const fileStream = createWriteStream(outputPath);
      await pipeline(response.body as NodeJS.ReadableStream, fileStream);
    } else {
      // Regular URL download
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const fileStream = createWriteStream(outputPath);
      await pipeline(response.body as NodeJS.ReadableStream, fileStream);
    }

    logger.info('Downloaded image', {
      service: SERVICE,
      url,
      outputPath,
    });
  } catch (error) {
    logger.error('Failed to download image', {
      service: SERVICE,
      url,
      outputPath,
      error,
    });
    throw error;
  }
}

/**
 * ImageCompressionService — thin facade over the image/ subdirectory modules.
 * All implementation lives in image/*.ts; this file is the public API surface.
 */
export type {
  CompressionResult,
  BatchCompressionResult,
  ProgressCallback,
} from './image/types';
import {
  compress,
  compressBatch,
  estimateCompressedSize,
  needsCompression,
  getCompressionStats,
} from './image/Compressor';
import {
  generateThumbnail,
  generateMultipleThumbnails,
} from './image/ThumbnailGenerator';

class ImageCompressionService {
  static compress = compress;
  static compressBatch = compressBatch;
  static generateThumbnail = generateThumbnail;
  static generateMultipleThumbnails = generateMultipleThumbnails;
  static estimateCompressedSize = estimateCompressedSize;
  static needsCompression = needsCompression;
  static getCompressionStats = getCompressionStats;
}

// Convenience functions (re-exported for backward compatibility)
export const compressProfilePhoto = (imageUri: string) =>
  compress(imageUri, { purpose: 'profile' });
export const compressJobPhoto = (imageUri: string) =>
  compress(imageUri, { purpose: 'job' });
export const compressPropertyAssessmentPhoto = (imageUri: string) =>
  compress(imageUri, { purpose: 'property-assessment' });
export const compressJobPhotos = (
  imageUris: string[],
  onProgress?: import('./image/types').ProgressCallback
) => compressBatch(imageUris, { purpose: 'job' }, onProgress);

export default ImageCompressionService;

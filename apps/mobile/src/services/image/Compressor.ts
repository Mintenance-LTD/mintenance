import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { logger, logMedia } from '../../utils/logger-enhanced';
import { extractExifData } from './ExifExtractor';
import { generateThumbnail } from './ThumbnailGenerator';
import { getImageDimensions, calculateTargetDimensions, getCompressionPreset, cleanupTempFile } from './CompressionHelpers';
import { COMPRESSION_PRESETS } from './types';
import type { CompressionOptions, CompressionResult, BatchCompressionResult, ExifData, ImagePurpose, ProgressCallback } from './types';

export async function compress(imageUri: string, options: CompressionOptions = {}): Promise<CompressionResult> {
  const startTime = Date.now();
  const purpose = options.purpose || 'custom';
  try {
    const preset = getCompressionPreset(purpose, options);
    const originalInfo = await FileSystem.getInfoAsync(imageUri);
    if (!originalInfo.exists) throw new Error('Image file not found');
    const originalSize = originalInfo.size || 0;

    let exifData: ExifData | undefined;
    if (preset.preserveExif) exifData = await extractExifData(imageUri);

    const { width: originalWidth, height: originalHeight } = await getImageDimensions(imageUri);
    const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(originalWidth, originalHeight, preset.maxWidth, preset.maxHeight, options.preserveAspectRatio ?? true);

    const manipulateActions: ImageManipulator.Action[] = [];
    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
      manipulateActions.push({ resize: { width: targetWidth, height: targetHeight } });
    }

    const compressedImage = await ImageManipulator.manipulateAsync(imageUri, manipulateActions, { compress: preset.quality, format: preset.format });
    const compressedInfo = await FileSystem.getInfoAsync(compressedImage.uri);
    const compressedSize = (compressedInfo.exists && 'size' in compressedInfo) ? (compressedInfo.size || 0) : 0;
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

    let thumbnailUri: string | undefined;
    if (options.generateThumbnail !== false) {
      thumbnailUri = await generateThumbnail(compressedImage.uri, options.thumbnailSize || preset.thumbnailSize);
    }

    const duration = Date.now() - startTime;
    logMedia('process', 'photo', true, { purpose, originalSize, compressedSize, duration });

    return { uri: compressedImage.uri, width: compressedImage.width, height: compressedImage.height, originalSize, compressedSize, compressionRatio, thumbnailUri, exifData };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Image compression failed', error as Error, { imageUri: imageUri.substring(0, 50), purpose, duration });
    logMedia('process', 'photo', false, { purpose, error: (error as Error).message });
    return { uri: imageUri, width: 0, height: 0, originalSize: 0, compressedSize: 0, compressionRatio: 1, error: (error as Error).message };
  }
}

export async function compressBatch(imageUris: string[], options: CompressionOptions = {}, onProgress?: ProgressCallback): Promise<BatchCompressionResult> {
  const startTime = Date.now();
  try {
    const results: CompressionResult[] = [];
    let successCount = 0, failureCount = 0, totalOriginalSize = 0, totalCompressedSize = 0;

    for (let i = 0; i < imageUris.length; i++) {
      if (onProgress) onProgress(i, imageUris.length, imageUris[i]);
      const result = await compress(imageUris[i], options);
      results.push(result);
      if (result.error) { failureCount++; } else { successCount++; totalOriginalSize += result.originalSize; totalCompressedSize += result.compressedSize; }
      if (i > 0 && results[i - 1] && !results[i - 1].error) await cleanupTempFile(results[i - 1].uri);
    }

    if (onProgress) onProgress(imageUris.length, imageUris.length, '');
    const duration = Date.now() - startTime;
    const totalCompressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1;
    return { results, totalOriginalSize, totalCompressedSize, totalCompressionRatio, successCount, failureCount, duration };
  } catch (error) {
    logger.error('Batch compression failed', error as Error);
    throw error;
  }
}

export async function estimateCompressedSize(imageUri: string, purpose: ImagePurpose = 'custom'): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists || !fileInfo.size) return 0;
    const preset = COMPRESSION_PRESETS[purpose];
    return Math.round(fileInfo.size * preset.quality * 0.3);
  } catch (error) {
    logger.error('Failed to estimate compressed size', error as Error);
    return 0;
  }
}

export async function needsCompression(imageUri: string, purpose: ImagePurpose = 'custom', thresholdMB = 2): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists || !fileInfo.size) return false;
    if (fileInfo.size / (1024 * 1024) > thresholdMB) return true;
    const { width, height } = await getImageDimensions(imageUri);
    const preset = COMPRESSION_PRESETS[purpose];
    return width > preset.maxWidth || height > preset.maxHeight;
  } catch (error) {
    logger.error('Failed to check if compression needed', error as Error);
    return true;
  }
}

export function getCompressionStats(result: CompressionResult): { savedBytes: number; savedMB: number; savedPercentage: number } {
  const savedBytes = result.originalSize - result.compressedSize;
  const savedMB = savedBytes / (1024 * 1024);
  const savedPercentage = result.originalSize > 0 ? (savedBytes / result.originalSize) * 100 : 0;
  return { savedBytes, savedMB, savedPercentage };
}

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { logger } from '../../utils/logger';
import { COMPRESSION_PRESETS } from './types';
import type { ImagePurpose, CompressionOptions, CompressionPreset } from './types';

export async function getImageDimensions(imageUri: string): Promise<{ width: number; height: number }> {
  try {
    const result = await ImageManipulator.manipulateAsync(imageUri, [], { compress: 1, format: ImageManipulator.SaveFormat.JPEG });
    return { width: result.width, height: result.height };
  } catch (error) {
    logger.error('Failed to get image dimensions', error as Error);
    throw error;
  }
}

export function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  preserveAspectRatio = true
): { width: number; height: number } {
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }
  if (!preserveAspectRatio) return { width: maxWidth, height: maxHeight };
  const aspectRatio = originalWidth / originalHeight;
  let targetWidth: number, targetHeight: number;
  if (originalWidth / maxWidth > originalHeight / maxHeight) {
    targetWidth = maxWidth;
    targetHeight = Math.round(maxWidth / aspectRatio);
  } else {
    targetHeight = maxHeight;
    targetWidth = Math.round(maxHeight * aspectRatio);
  }
  return { width: Math.min(targetWidth, originalWidth), height: Math.min(targetHeight, originalHeight) };
}

export function getCompressionPreset(purpose: ImagePurpose, options: CompressionOptions): CompressionPreset {
  const basePreset = COMPRESSION_PRESETS[purpose];
  return {
    maxWidth: options.maxWidth ?? basePreset.maxWidth,
    maxHeight: options.maxHeight ?? basePreset.maxHeight,
    quality: options.quality ?? basePreset.quality,
    format: options.format ?? basePreset.format,
    thumbnailSize: options.thumbnailSize ?? basePreset.thumbnailSize,
    preserveExif: options.preserveExif ?? basePreset.preserveExif,
  };
}

export async function cleanupTempFile(uri: string): Promise<void> {
  try {
    if (uri.includes('ImageManipulator') || uri.includes('cache')) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // Non-critical
  }
}

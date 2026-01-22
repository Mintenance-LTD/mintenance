/**
 * Image Compression Service for Mobile App
 *
 * Handles intelligent image compression before upload to:
 * - Reduce upload sizes and improve performance
 * - Maintain quality based on image purpose
 * - Generate thumbnails for list views
 * - Preserve EXIF data (location, timestamp) when needed
 *
 * Uses expo-image-manipulator for native compression performance
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { logger, logMedia } from '../utils/logger-enhanced';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Image purpose determines compression quality and size
 */
export type ImagePurpose = 'profile' | 'job' | 'property-assessment' | 'thumbnail' | 'custom';

/**
 * Compression preset configuration
 */
interface CompressionPreset {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: ImageManipulator.SaveFormat;
  thumbnailSize: number;
  preserveExif: boolean;
}

/**
 * Options for image compression
 */
export interface CompressionOptions {
  purpose?: ImagePurpose;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: ImageManipulator.SaveFormat;
  preserveAspectRatio?: boolean;
  preserveExif?: boolean;
  generateThumbnail?: boolean;
  thumbnailSize?: number;
}

/**
 * Result of image compression
 */
export interface CompressionResult {
  uri: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  thumbnailUri?: string;
  exifData?: ExifData;
  error?: string;
}

/**
 * Result of batch compression
 */
export interface BatchCompressionResult {
  results: CompressionResult[];
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalCompressionRatio: number;
  successCount: number;
  failureCount: number;
  duration: number;
}

/**
 * EXIF data extracted from image
 */
export interface ExifData {
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  orientation?: number;
  make?: string;
  model?: string;
  [key: string]: unknown;
}

/**
 * Progress callback for batch operations
 */
export type ProgressCallback = (processed: number, total: number, currentFile: string) => void;

// ============================================================================
// COMPRESSION PRESETS
// ============================================================================

const COMPRESSION_PRESETS: Record<ImagePurpose, CompressionPreset> = {
  'profile': {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
    thumbnailSize: 200,
    preserveExif: false, // Privacy: don't need location for profiles
  },
  'job': {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
    thumbnailSize: 200,
    preserveExif: true, // Useful for job location verification
  },
  'property-assessment': {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
    thumbnailSize: 200,
    preserveExif: true, // Critical for damage detection and location
  },
  'thumbnail': {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.6,
    format: ImageManipulator.SaveFormat.JPEG,
    thumbnailSize: 200,
    preserveExif: false,
  },
  'custom': {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.75,
    format: ImageManipulator.SaveFormat.JPEG,
    thumbnailSize: 200,
    preserveExif: false,
  },
};

// ============================================================================
// IMAGE COMPRESSION SERVICE
// ============================================================================

export class ImageCompressionService {
  /**
   * Compress a single image with smart quality selection
   */
  static async compress(
    imageUri: string,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const purpose = options.purpose || 'custom';

    try {
      logger.info('Starting image compression', {
        imageUri: imageUri.substring(0, 50),
        purpose,
        options,
      });

      // Get compression preset
      const preset = this.getCompressionPreset(purpose, options);

      // Get original image info
      const originalInfo = await FileSystem.getInfoAsync(imageUri);
      if (!originalInfo.exists) {
        throw new Error('Image file not found');
      }
      const originalSize = originalInfo.size || 0;

      // Extract EXIF data if needed (before compression)
      let exifData: ExifData | undefined;
      if (preset.preserveExif) {
        exifData = await this.extractExifData(imageUri);
      }

      // Get image dimensions
      const { width: originalWidth, height: originalHeight } = await this.getImageDimensions(imageUri);

      // Calculate target dimensions maintaining aspect ratio
      const { width: targetWidth, height: targetHeight } = this.calculateTargetDimensions(
        originalWidth,
        originalHeight,
        preset.maxWidth,
        preset.maxHeight,
        options.preserveAspectRatio ?? true
      );

      // Perform compression
      const manipulateActions: ImageManipulator.Action[] = [];

      // Resize if needed
      if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
        manipulateActions.push({
          resize: {
            width: targetWidth,
            height: targetHeight,
          },
        });
      }

      const compressedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        manipulateActions,
        {
          compress: preset.quality,
          format: preset.format,
        }
      );

      // Get compressed size
      const compressedInfo = await FileSystem.getInfoAsync(compressedImage.uri);
      const compressedSize = (compressedInfo.exists && 'size' in compressedInfo) ? (compressedInfo.size || 0) : 0;

      // Calculate compression ratio
      const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

      // Generate thumbnail if requested
      let thumbnailUri: string | undefined;
      if (options.generateThumbnail !== false) {
        thumbnailUri = await this.generateThumbnail(
          compressedImage.uri,
          options.thumbnailSize || preset.thumbnailSize
        );
      }

      const duration = Date.now() - startTime;

      const result: CompressionResult = {
        uri: compressedImage.uri,
        width: compressedImage.width,
        height: compressedImage.height,
        originalSize,
        compressedSize,
        compressionRatio,
        thumbnailUri,
        exifData,
      };

      logger.info('Image compression completed', {
        purpose,
        originalSize,
        compressedSize,
        compressionRatio: `${(compressionRatio * 100).toFixed(1)}%`,
        duration,
      });

      logMedia('process', 'photo', true, {
        purpose,
        originalSize,
        compressedSize,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Image compression failed', error as Error, {
        imageUri: imageUri.substring(0, 50),
        purpose,
        duration,
      });

      logMedia('process', 'photo', false, {
        purpose,
        error: (error as Error).message,
      });

      return {
        uri: imageUri,
        width: 0,
        height: 0,
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 1,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Compress multiple images in batch with progress callback
   */
  static async compressBatch(
    imageUris: string[],
    options: CompressionOptions = {},
    onProgress?: ProgressCallback
  ): Promise<BatchCompressionResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting batch compression', {
        count: imageUris.length,
        purpose: options.purpose,
      });

      const results: CompressionResult[] = [];
      let successCount = 0;
      let failureCount = 0;
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;

      // Process images sequentially to avoid memory issues
      for (let i = 0; i < imageUris.length; i++) {
        const imageUri = imageUris[i];

        // Call progress callback
        if (onProgress) {
          onProgress(i, imageUris.length, imageUri);
        }

        // Compress image
        const result = await this.compress(imageUri, options);
        results.push(result);

        // Update stats
        if (result.error) {
          failureCount++;
        } else {
          successCount++;
          totalOriginalSize += result.originalSize;
          totalCompressedSize += result.compressedSize;
        }

        // Clean up previous compressed image to free memory (keep only the latest)
        if (i > 0 && results[i - 1] && !results[i - 1].error) {
          await this.cleanupTempFile(results[i - 1].uri);
        }
      }

      // Final progress callback
      if (onProgress) {
        onProgress(imageUris.length, imageUris.length, '');
      }

      const duration = Date.now() - startTime;
      const totalCompressionRatio = totalOriginalSize > 0
        ? totalCompressedSize / totalOriginalSize
        : 1;

      logger.info('Batch compression completed', {
        total: imageUris.length,
        success: successCount,
        failure: failureCount,
        totalOriginalSize,
        totalCompressedSize,
        totalCompressionRatio: `${(totalCompressionRatio * 100).toFixed(1)}%`,
        duration,
      });

      return {
        results,
        totalOriginalSize,
        totalCompressedSize,
        totalCompressionRatio,
        successCount,
        failureCount,
        duration,
      };
    } catch (error) {
      logger.error('Batch compression failed', error as Error);
      throw error;
    }
  }

  /**
   * Generate thumbnail from image
   */
  static async generateThumbnail(
    imageUri: string,
    size: number = 200
  ): Promise<string> {
    try {
      const thumbnail = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: size,
              height: size,
            },
          },
        ],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      logger.debug('Thumbnail generated', {
        originalUri: imageUri.substring(0, 50),
        thumbnailUri: thumbnail.uri.substring(0, 50),
        size,
      });

      return thumbnail.uri;
    } catch (error) {
      logger.error('Thumbnail generation failed', error as Error);
      throw error;
    }
  }

  /**
   * Generate multiple thumbnail sizes
   */
  static async generateMultipleThumbnails(
    imageUri: string,
    sizes: number[] = [100, 200, 400]
  ): Promise<Array<{ size: number; uri: string }>> {
    try {
      const thumbnails = await Promise.all(
        sizes.map(async (size) => ({
          size,
          uri: await this.generateThumbnail(imageUri, size),
        }))
      );

      logger.debug('Multiple thumbnails generated', {
        imageUri: imageUri.substring(0, 50),
        sizes,
        count: thumbnails.length,
      });

      return thumbnails;
    } catch (error) {
      logger.error('Multiple thumbnail generation failed', error as Error);
      throw error;
    }
  }

  /**
   * Extract EXIF data from image
   *
   * Note: expo-image-manipulator doesn't provide EXIF extraction directly.
   * For production, consider using expo-media-library or react-native-image-picker
   * which provide EXIF data. This is a placeholder implementation.
   */
  private static async extractExifData(imageUri: string): Promise<ExifData | undefined> {
    try {
      // IMPLEMENTATION: Use expo-media-library for EXIF extraction
      const MediaLibrary = await import('expo-media-library');

      // Check if we have permission
      const { status } = await MediaLibrary.default.getPermissionsAsync();
      if (status !== 'granted') {
        logger.debug('Media library permission not granted, skipping EXIF extraction');
        return undefined;
      }

      // For photo library assets (ph:// or content://)
      if (imageUri.startsWith('ph://') || imageUri.startsWith('content://')) {
        const asset = await MediaLibrary.default.getAssetInfoAsync(imageUri);

        if (asset && asset.exif) {
          const exifData: ExifData = {
            latitude: asset.exif.GPSLatitude || asset.location?.latitude,
            longitude: asset.exif.GPSLongitude || asset.location?.longitude,
            timestamp: asset.exif.DateTimeOriginal || asset.creationTime,
            deviceMake: asset.exif.Make,
            deviceModel: asset.exif.Model,
            orientation: asset.exif.Orientation,
            altitude: asset.exif.GPSAltitude || asset.location?.altitude,
          };

          logger.debug('EXIF data extracted successfully', {
            hasGPS: !!(exifData.latitude && exifData.longitude),
            hasDevice: !!exifData.deviceMake,
          });

          return exifData;
        }
      }

      // For file:// URIs from camera, try to get asset by searching
      if (imageUri.startsWith('file://')) {
        // Search for recently modified assets (within last minute)
        const recentAssets = await MediaLibrary.default.getAssetsAsync({
          first: 5,
          sortBy: ['modificationTime'],
        });

        // Find matching asset by modification time
        for (const asset of recentAssets.assets) {
          const assetInfo = await MediaLibrary.default.getAssetInfoAsync(asset.id);
          if (assetInfo.localUri === imageUri || assetInfo.uri === imageUri) {
            if (assetInfo.exif) {
              return {
                latitude: assetInfo.exif.GPSLatitude || assetInfo.location?.latitude,
                longitude: assetInfo.exif.GPSLongitude || assetInfo.location?.longitude,
                timestamp: assetInfo.exif.DateTimeOriginal || assetInfo.creationTime,
                deviceMake: assetInfo.exif.Make,
                deviceModel: assetInfo.exif.Model,
                orientation: assetInfo.exif.Orientation,
                altitude: assetInfo.exif.GPSAltitude || assetInfo.location?.altitude,
              };
            }
          }
        }
      }

      logger.debug('No EXIF data found for image', {
        uriPrefix: imageUri.substring(0, 20),
      });

      return undefined;
    } catch (error) {
      logger.warn('EXIF extraction failed', { error });
      return undefined;
    }
  }

  /**
   * Get image dimensions without loading full image
   */
  private static async getImageDimensions(
    imageUri: string
  ): Promise<{ width: number; height: number }> {
    try {
      // expo-image-manipulator requires a manipulation to get dimensions
      // Use a no-op manipulation with base64 output to get dimensions efficiently
      const result = await ImageManipulator.manipulateAsync(imageUri, [], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      return {
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      logger.error('Failed to get image dimensions', error as Error);
      throw error;
    }
  }

  /**
   * Calculate target dimensions maintaining aspect ratio
   */
  private static calculateTargetDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    preserveAspectRatio: boolean = true
  ): { width: number; height: number } {
    // If no resizing needed, return original dimensions
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    if (!preserveAspectRatio) {
      return { width: maxWidth, height: maxHeight };
    }

    // Calculate aspect ratio
    const aspectRatio = originalWidth / originalHeight;

    let targetWidth = maxWidth;
    let targetHeight = maxHeight;

    if (originalWidth / maxWidth > originalHeight / maxHeight) {
      // Width is the limiting factor
      targetWidth = maxWidth;
      targetHeight = Math.round(maxWidth / aspectRatio);
    } else {
      // Height is the limiting factor
      targetHeight = maxHeight;
      targetWidth = Math.round(maxHeight * aspectRatio);
    }

    return {
      width: Math.min(targetWidth, originalWidth),
      height: Math.min(targetHeight, originalHeight),
    };
  }

  /**
   * Get compression preset with options override
   */
  private static getCompressionPreset(
    purpose: ImagePurpose,
    options: CompressionOptions
  ): CompressionPreset {
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

  /**
   * Clean up temporary file
   */
  private static async cleanupTempFile(uri: string): Promise<void> {
    try {
      // Only cleanup files in cache directory
      if (uri.includes('ImageManipulator') || uri.includes('cache')) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        logger.debug('Cleaned up temp file', { uri: uri.substring(0, 50) });
      }
    } catch (error) {
      // Ignore cleanup errors
      logger.debug('Temp file cleanup failed (non-critical)', { uri: uri.substring(0, 50) });
    }
  }

  /**
   * Estimate compressed size before actual compression
   * Useful for showing progress indicators
   */
  static async estimateCompressedSize(
    imageUri: string,
    purpose: ImagePurpose = 'custom'
  ): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists || !fileInfo.size) {
        return 0;
      }

      const preset = COMPRESSION_PRESETS[purpose];

      // Rough estimation based on quality and typical compression ratios
      // JPEG typically compresses to 10-30% of original at quality 0.7-0.9
      const estimatedRatio = preset.quality * 0.3;

      return Math.round(fileInfo.size * estimatedRatio);
    } catch (error) {
      logger.error('Failed to estimate compressed size', error as Error);
      return 0;
    }
  }

  /**
   * Check if image needs compression
   */
  static async needsCompression(
    imageUri: string,
    purpose: ImagePurpose = 'custom',
    thresholdMB: number = 2
  ): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists || !fileInfo.size) {
        return false;
      }

      const sizeMB = fileInfo.size / (1024 * 1024);
      const threshold = thresholdMB;

      // Check size threshold
      if (sizeMB > threshold) {
        return true;
      }

      // Check dimensions
      const { width, height } = await this.getImageDimensions(imageUri);
      const preset = COMPRESSION_PRESETS[purpose];

      return width > preset.maxWidth || height > preset.maxHeight;
    } catch (error) {
      logger.error('Failed to check if compression needed', error as Error);
      return true; // Default to compressing if check fails
    }
  }

  /**
   * Get compression statistics for reporting
   */
  static getCompressionStats(result: CompressionResult): {
    savedBytes: number;
    savedMB: number;
    savedPercentage: number;
  } {
    const savedBytes = result.originalSize - result.compressedSize;
    const savedMB = savedBytes / (1024 * 1024);
    const savedPercentage = result.originalSize > 0
      ? (savedBytes / result.originalSize) * 100
      : 0;

    return {
      savedBytes,
      savedMB,
      savedPercentage,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Compress image for profile photo upload
 */
export const compressProfilePhoto = (imageUri: string) =>
  ImageCompressionService.compress(imageUri, { purpose: 'profile' });

/**
 * Compress image for job photo upload
 */
export const compressJobPhoto = (imageUri: string) =>
  ImageCompressionService.compress(imageUri, { purpose: 'job' });

/**
 * Compress image for property assessment upload
 */
export const compressPropertyAssessmentPhoto = (imageUri: string) =>
  ImageCompressionService.compress(imageUri, { purpose: 'property-assessment' });

/**
 * Compress multiple job photos with progress
 */
export const compressJobPhotos = (
  imageUris: string[],
  onProgress?: ProgressCallback
) =>
  ImageCompressionService.compressBatch(
    imageUris,
    { purpose: 'job' },
    onProgress
  );

// Export service as default
export default ImageCompressionService;

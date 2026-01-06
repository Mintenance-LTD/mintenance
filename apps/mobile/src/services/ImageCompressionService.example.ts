/**
 * ImageCompressionService - Usage Examples
 *
 * This file demonstrates how to use the ImageCompressionService
 * in various scenarios throughout the Mintenance mobile app.
 *
 * DO NOT import this file in production code - it's for reference only.
 */

import ImageCompressionService, {
  compressProfilePhoto,
  compressJobPhoto,
  compressPropertyAssessmentPhoto,
  compressJobPhotos,
  type CompressionResult,
  type BatchCompressionResult,
  type ProgressCallback,
} from './ImageCompressionService';
import { PhotoUploadService } from './PhotoUploadService';
import * as ImagePicker from 'expo-image-picker';

// ============================================================================
// EXAMPLE 1: Compress Profile Photo
// ============================================================================

export async function uploadProfilePhotoExample() {
  // 1. Pick image from gallery
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: false,
    quality: 1.0, // Get full quality, we'll compress it ourselves
  });

  if (result.canceled || !result.assets[0]) {
    return;
  }

  const imageUri = result.assets[0].uri;

  // 2. Compress image for profile (800x800, 0.7 quality)
  const compressed = await compressProfilePhoto(imageUri);

  if (compressed.error) {
    logger.error('Compression failed:', compressed.error', [object Object], { service: 'mobile' });
    return;
  }

  // 3. Show compression stats to user
  const stats = ImageCompressionService.getCompressionStats(compressed);
  logger.info('Saved ${stats.savedMB.toFixed(2', [object Object], { service: 'mobile' })} MB (${stats.savedPercentage.toFixed(0)}%)`);

  // 4. Upload compressed image
  // ... upload compressed.uri to server
}

// ============================================================================
// EXAMPLE 2: Compress and Upload Job Photos
// ============================================================================

export async function uploadJobPhotosExample(jobId: string) {
  // 1. Pick multiple images
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 1.0, // Get full quality, we'll compress
  });

  if (result.canceled || !result.assets.length) {
    return;
  }

  const imageUris = result.assets.map(asset => asset.uri);

  // 2. Compress with progress tracking
  const onProgress: ProgressCallback = (processed, total, currentFile) => {
    const percentage = Math.round((processed / total) * 100);
    logger.info('Compressing: %s% (%s/%s', [object Object], { service: 'mobile' })`);
    // Update UI progress indicator here
  };

  const batchResult = await compressJobPhotos(imageUris, onProgress);

  // 3. Show overall stats
  logger.info('
    Total: %s images
    Success: %s
    Failed: %s
    Original size: ${(batchResult.totalOriginalSize / 1024 / 1024', {
        service: 'mobile'
      }).toFixed(2)} MB
    Compressed size: ${(batchResult.totalCompressedSize / 1024 / 1024).toFixed(2)} MB
    Saved: ${((1 - batchResult.totalCompressionRatio) * 100).toFixed(0)}%
    Time: ${(batchResult.duration / 1000).toFixed(1)}s
  `);

  // 4. Upload compressed images
  const compressedUris = batchResult.results
    .filter(r => !r.error)
    .map(r => r.uri);

  // Convert to ImagePickerAsset format expected by PhotoUploadService
  const compressedAssets = compressedUris.map((uri, index) => ({
    uri,
    width: batchResult.results[index].width,
    height: batchResult.results[index].height,
    assetId: null,
    fileName: `compressed_${index}.jpg`,
    fileSize: batchResult.results[index].compressedSize,
    type: 'image' as const,
    duration: null,
  }));

  // Use existing PhotoUploadService
  const uploadResults = await PhotoUploadService.uploadBeforePhotos(
    jobId,
    compressedAssets
  );

  return uploadResults;
}

// ============================================================================
// EXAMPLE 3: Property Assessment with High Quality
// ============================================================================

export async function uploadPropertyAssessmentExample(assessmentId: string) {
  // 1. Take photo with camera
  const photo = await PhotoUploadService.takePhoto();

  if (!photo) {
    return;
  }

  // 2. Compress for property assessment (1600x1600, 0.85 quality)
  // This maintains high quality for AI damage detection
  const compressed = await compressPropertyAssessmentPhoto(photo.uri);

  if (compressed.error) {
    logger.error('Compression failed:', compressed.error', [object Object], { service: 'mobile' });
    return;
  }

  // 3. Use both thumbnail and full image
  logger.info('Full image:', compressed.uri', [object Object], { service: 'mobile' });
  logger.info('Thumbnail:', compressed.thumbnailUri', [object Object], { service: 'mobile' });

  // 4. Upload to property assessment endpoint
  // ... use compressed.uri for full image
  // ... use compressed.thumbnailUri for list view
}

// ============================================================================
// EXAMPLE 4: Check if Compression is Needed
// ============================================================================

export async function smartCompressionExample(imageUri: string) {
  // Check if image needs compression (> 2MB or larger than job preset)
  const needsCompression = await ImageCompressionService.needsCompression(
    imageUri,
    'job',
    2 // threshold in MB
  );

  if (needsCompression) {
    logger.info('Image needs compression', [object Object], { service: 'mobile' });
    const compressed = await compressJobPhoto(imageUri);
    return compressed.uri;
  } else {
    logger.info('Image is already optimized', [object Object], { service: 'mobile' });
    return imageUri;
  }
}

// ============================================================================
// EXAMPLE 5: Custom Compression Settings
// ============================================================================

export async function customCompressionExample(imageUri: string) {
  const compressed = await ImageCompressionService.compress(imageUri, {
    purpose: 'custom',
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.9,
    preserveAspectRatio: true,
    preserveExif: true,
    generateThumbnail: true,
    thumbnailSize: 300,
  });

  return compressed;
}

// ============================================================================
// EXAMPLE 6: Generate Multiple Thumbnail Sizes
// ============================================================================

export async function generateThumbnailsExample(imageUri: string) {
  // First compress the main image
  const compressed = await compressJobPhoto(imageUri);

  if (compressed.error) {
    return;
  }

  // Generate multiple thumbnail sizes for different uses
  const thumbnails = await ImageCompressionService.generateMultipleThumbnails(
    compressed.uri,
    [100, 200, 400] // Small, Medium, Large thumbnails
  );

  logger.info('Thumbnails:', thumbnails', [object Object], { service: 'mobile' });
  // thumbnails[0] = 100x100 for tiny icons
  // thumbnails[1] = 200x200 for list views
  // thumbnails[2] = 400x400 for grid views

  return {
    full: compressed.uri,
    thumbnails,
  };
}

// ============================================================================
// EXAMPLE 7: Estimate Size Before Compression
// ============================================================================

export async function estimateSizeExample(imageUri: string) {
  // Estimate how much space we'll save
  const estimatedSize = await ImageCompressionService.estimateCompressedSize(
    imageUri,
    'job'
  );

  logger.info('Estimated compressed size: ${(estimatedSize / 1024 / 1024', [object Object], { service: 'mobile' }).toFixed(2)} MB`);

  // Show user before compressing
  const shouldCompress = confirm(
    `This will reduce the image to approximately ${(estimatedSize / 1024 / 1024).toFixed(2)} MB. Continue?`
  );

  if (shouldCompress) {
    return await compressJobPhoto(imageUri);
  }
}

// ============================================================================
// EXAMPLE 8: Integration with PhotoUploadService (Complete Flow)
// ============================================================================

export async function completeUploadFlowExample(jobId: string) {
  // 1. Request permissions
  const permissions = await PhotoUploadService.requestPermissions();

  if (!permissions.camera) {
    logger.error('Camera permission required', [object Object], { service: 'mobile' });
    return;
  }

  // 2. Pick or take photos
  const photos = await PhotoUploadService.pickImages(true);

  if (!photos.length) {
    return;
  }

  // 3. Compress all photos with progress
  const imageUris = photos.map(p => p.uri);
  const progressCallback: ProgressCallback = (processed, total) => {
    logger.info('Processing: %s/%s', [object Object], { service: 'mobile' });
    // Update UI progress bar
  };

  const compressionResult = await ImageCompressionService.compressBatch(
    imageUris,
    { purpose: 'job', generateThumbnail: true },
    progressCallback
  );

  // 4. Convert back to ImagePickerAsset format
  const compressedAssets = compressionResult.results
    .filter(r => !r.error)
    .map((result, index) => ({
      uri: result.uri,
      width: result.width,
      height: result.height,
      assetId: null,
      fileName: `job_photo_${index}.jpg`,
      fileSize: result.compressedSize,
      type: 'image' as const,
      duration: null,
    }));

  // 5. Upload using existing service
  const uploadResults = await PhotoUploadService.uploadBeforePhotos(
    jobId,
    compressedAssets
  );

  // 6. Show results
  const successCount = uploadResults.filter(r => r.success).length;
  logger.info('Uploaded %s/%s photos', [object Object], { service: 'mobile' });

  return {
    compressionStats: {
      savedMB: (
        (compressionResult.totalOriginalSize - compressionResult.totalCompressedSize) /
        1024 /
        1024
      ).toFixed(2),
      savedPercentage: ((1 - compressionResult.totalCompressionRatio) * 100).toFixed(0),
    },
    uploadResults,
  };
}

// ============================================================================
// EXAMPLE 9: React Native Component Integration
// ============================================================================

/**
 * Example React component that uses the compression service
 */
/*
import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator } from 'react-native';
import { logger } from '@mintenance/shared';

export function ImageUploadComponent({ jobId }: { jobId: string }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<string>('');

  const handleUpload = async () => {
    setUploading(true);
    setProgress(0);

    try {
      // Pick images
      const photos = await PhotoUploadService.pickImages(true);
      if (!photos.length) {
        setUploading(false);
        return;
      }

      // Compress with progress
      const imageUris = photos.map(p => p.uri);
      const result = await ImageCompressionService.compressBatch(
        imageUris,
        { purpose: 'job' },
        (processed, total) => {
          setProgress(Math.round((processed / total) * 100));
        }
      );

      // Show stats
      const savedMB = (
        (result.totalOriginalSize - result.totalCompressedSize) /
        1024 /
        1024
      ).toFixed(2);
      setStats(`Saved ${savedMB} MB`);

      // Upload compressed images
      const compressedAssets = result.results
        .filter(r => !r.error)
        .map((r, i) => ({
          uri: r.uri,
          width: r.width,
          height: r.height,
          assetId: null,
          fileName: `photo_${i}.jpg`,
          fileSize: r.compressedSize,
          type: 'image' as const,
          duration: null,
        }));

      await PhotoUploadService.uploadBeforePhotos(jobId, compressedAssets);
      alert('Upload successful!');
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View>
      <Button
        title="Upload Photos"
        onPress={handleUpload}
        disabled={uploading}
      />
      {uploading && (
        <View>
          <ActivityIndicator />
          <Text>Compressing: {progress}%</Text>
        </View>
      )}
      {stats && <Text>{stats}</Text>}
    </View>
  );
}
*/

// ============================================================================
// EXAMPLE 10: Error Handling
// ============================================================================

export async function errorHandlingExample(imageUri: string) {
  try {
    // Attempt compression
    const result = await ImageCompressionService.compress(imageUri, {
      purpose: 'job',
    });

    if (result.error) {
      // Compression failed, but didn't throw
      logger.error('Compression failed:', result.error', [object Object], { service: 'mobile' });

      // Fallback: use original image
      logger.info('Using original image as fallback', [object Object], { service: 'mobile' });
      return imageUri;
    }

    // Success
    return result.uri;
  } catch (error) {
    // Unexpected error
    logger.error('Unexpected error during compression:', error', [object Object], { service: 'mobile' });

    // Fallback: use original image
    return imageUri;
  }
}

// ============================================================================
// BEST PRACTICES
// ============================================================================

/**
 * 1. ALWAYS compress images before upload to:
 *    - Reduce bandwidth usage
 *    - Improve upload speed
 *    - Reduce storage costs
 *    - Improve user experience
 *
 * 2. Choose the right purpose:
 *    - 'profile': User avatars (800x800, 0.7 quality)
 *    - 'job': Regular job photos (1200x1200, 0.8 quality)
 *    - 'property-assessment': High-quality for AI (1600x1600, 0.85 quality)
 *    - 'thumbnail': Small previews (200x200, 0.6 quality)
 *    - 'custom': Full control over settings
 *
 * 3. Show progress for batch operations:
 *    - Users need feedback for multiple images
 *    - Use ProgressCallback for real-time updates
 *
 * 4. Generate thumbnails for list views:
 *    - Significantly improves list scroll performance
 *    - Reduces memory usage
 *
 * 5. Handle errors gracefully:
 *    - Check result.error
 *    - Fallback to original image if compression fails
 *    - Show user-friendly error messages
 *
 * 6. Clean up temporary files:
 *    - The service automatically cleans up during batch operations
 *    - Consider manual cleanup for long-running apps
 *
 * 7. Check if compression is needed:
 *    - Use needsCompression() to avoid unnecessary work
 *    - Small images may not benefit from compression
 *
 * 8. Preserve EXIF when needed:
 *    - Job photos: YES (location verification)
 *    - Property assessments: YES (damage location)
 *    - Profile photos: NO (privacy)
 *    - Thumbnails: NO (reduces size)
 *
 * 9. Monitor compression stats:
 *    - Use getCompressionStats() for analytics
 *    - Track bandwidth savings
 *    - Optimize presets based on real data
 *
 * 10. Test on real devices:
 *     - Compression speed varies by device
 *     - Test memory usage with large batches
 *     - Verify quality on different screen sizes
 */

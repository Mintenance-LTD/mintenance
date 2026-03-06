/**
 * Enhanced Photo Upload Service for Mobile App
 * Handles before/after photos, video walkthroughs, and photo metadata
 * Uses unified API client for API calls
 */

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { logger } from '../utils/logger';
import { mobileApiClient } from '../utils/mobileApiClient';
import { parseError, getUserFriendlyMessage } from '@mintenance/api-client';

export interface PhotoMetadata {
  url: string;
  type: 'before' | 'after' | 'video';
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  quality?: 'high' | 'medium' | 'low';
  angle?: string;
}

export interface PhotoUploadResult {
  success: boolean;
  photoId?: string;
  url?: string;
  metadata?: PhotoMetadata;
  error?: string;
}

export class PhotoUploadService {
  /**
   * Request camera and location permissions
   */
  static async requestPermissions(): Promise<{
    camera: boolean;
    location: boolean;
  }> {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const locationPermission = await Location.requestForegroundPermissionsAsync();

    return {
      camera: cameraPermission.granted,
      location: locationPermission.granted,
    };
  }

  /**
   * Upload before photos at job start
   */
  static async uploadBeforePhotos(
    jobId: string,
    photos: ImagePicker.ImagePickerAsset[]
  ): Promise<PhotoUploadResult[]> {
    const results: PhotoUploadResult[] = [];

    for (const photo of photos) {
      try {
        const location = await this.getCurrentLocation();
        const metadata: PhotoMetadata = {
          url: photo.uri,
          type: 'before',
          timestamp: new Date().toISOString(),
          geolocation: location,
          quality: this.assessPhotoQuality(photo),
        };

        const ext = photo.uri.split('.').pop()?.toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
        const formData = new FormData();
        formData.append('photo', {
          uri: photo.uri,
          type: mimeType,
          name: `before_${Date.now()}.${ext || 'jpg'}`,
        } as unknown);
        formData.append('metadata', JSON.stringify(metadata));

        let response: { photoId?: string; url?: string };
        try {
          response = await mobileApiClient.postFormData<{ photoId?: string; url?: string }>(
            `/api/jobs/${jobId}/photos/before`,
            formData
          );
        } catch (uploadError) {
          const apiError = parseError(uploadError);
          results.push({
            success: false,
            error: getUserFriendlyMessage(apiError),
          });
          continue;
        }

        results.push({
          success: true,
          photoId: response.photoId,
          url: response.url,
          metadata,
        });
      } catch (error) {
        const apiError = parseError(error);
        logger.error('Error uploading before photo', { error: apiError });
        results.push({
          success: false,
          error: getUserFriendlyMessage(apiError),
        });
      }
    }

    return results;
  }

  /**
   * Upload after photos at job completion
   */
  static async uploadAfterPhotos(
    jobId: string,
    photos: ImagePicker.ImagePickerAsset[]
  ): Promise<PhotoUploadResult[]> {
    const results: PhotoUploadResult[] = [];

    for (const photo of photos) {
      try {
        const location = await this.getCurrentLocation();
        const metadata: PhotoMetadata = {
          url: photo.uri,
          type: 'after',
          timestamp: new Date().toISOString(),
          geolocation: location,
          quality: this.assessPhotoQuality(photo),
        };

        const ext = photo.uri.split('.').pop()?.toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
        const formData = new FormData();
        formData.append('photo', {
          uri: photo.uri,
          type: mimeType,
          name: `after_${Date.now()}.${ext || 'jpg'}`,
        } as unknown);
        formData.append('metadata', JSON.stringify(metadata));

        let data: { photoId?: string; url?: string };
        try {
          data = await mobileApiClient.postFormData<{ photoId?: string; url?: string }>(
            `/api/jobs/${jobId}/photos/after`,
            formData
          );
        } catch (uploadError) {
          const apiError = parseError(uploadError);
          results.push({
            success: false,
            error: getUserFriendlyMessage(apiError),
          });
          continue;
        }

        results.push({
          success: true,
          photoId: data.photoId,
          url: data.url,
          metadata,
        });
      } catch (error) {
        const apiError = parseError(error);
        logger.error('Error uploading after photo', { error: apiError });
        results.push({
          success: false,
          error: getUserFriendlyMessage(apiError),
        });
      }
    }

    return results;
  }

  /**
   * Upload optional video walkthrough
   */
  static async uploadVideoWalkthrough(
    jobId: string,
    video: ImagePicker.ImagePickerAsset
  ): Promise<PhotoUploadResult> {
    try {
      const location = await this.getCurrentLocation();
      const metadata: PhotoMetadata = {
        url: video.uri,
        type: 'video',
        timestamp: new Date().toISOString(),
        geolocation: location,
      };

      const formData = new FormData();
      formData.append('video', {
        uri: video.uri,
        type: 'video/mp4',
        name: `walkthrough_${Date.now()}.mp4`,
      } as unknown);
      formData.append('metadata', JSON.stringify(metadata));

      const data = await mobileApiClient.postFormData<{ photoId?: string; url?: string }>(
        `/api/jobs/${jobId}/photos/video`,
        formData
      );

      return {
        success: true,
        photoId: data.photoId,
        url: data.url,
        metadata,
      };
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error uploading video walkthrough', { error: apiError });
      return {
        success: false,
        error: getUserFriendlyMessage(apiError),
      };
    }
  }

  /**
   * Trigger enhanced photo verification
   */
  static async verifyPhotos(escrowId: string): Promise<void> {
    try {
      await mobileApiClient.post(`/api/escrow/${escrowId}/verify-photos-enhanced`);
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error verifying photos', { error: apiError, escrowId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Get current location
   */
  private static async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
  } | undefined> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return undefined;
      }

      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      logger.warn('Could not get location', error);
      return undefined;
    }
  }

  /**
   * Assess photo quality using resolution and JPEG compression ratio.
   *
   * Compression ratio (bytes/pixel) is a meaningful proxy for sharpness:
   * sharp, well-exposed images contain more high-frequency detail and compress
   * less aggressively than blurry or underexposed ones.
   *
   * Note: the server-side PhotoVerificationService runs an independent quality
   * check on upload — this value is used for client-side UX feedback only.
   */
  private static assessPhotoQuality(
    photo: ImagePicker.ImagePickerAsset
  ): 'high' | 'medium' | 'low' {
    const { width, height, fileSize } = photo;
    if (!width || !height) return 'low';

    const megapixels = (width * height) / 1_000_000;
    if (megapixels < 1) return 'low';  // minimum resolution gate

    if (fileSize) {
      // bytes/pixel: sharp/well-exposed JPEG ≈ 0.15–0.30, blurry/dark ≈ 0.05–0.12
      const bytesPerPixel = fileSize / (width * height);
      if (megapixels >= 4 && bytesPerPixel >= 0.15) return 'high';
      if (megapixels >= 1 && bytesPerPixel >= 0.08) return 'medium';
      return 'low';
    }

    // fileSize unavailable (some picker configurations omit it) — resolution-only fallback
    if (megapixels >= 8) return 'high';
    if (megapixels >= 2) return 'medium';
    return 'low';
  }

  /**
   * Pick images from camera or gallery
   */
  static async pickImages(
    allowsMultiple: boolean = true
  ): Promise<ImagePicker.ImagePickerAsset[]> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: allowsMultiple,
      quality: 0.9,
      allowsEditing: false,
    });

    if (result.canceled) {
      return [];
    }

    return result.assets;
  }

  /**
   * Take photo with camera
   */
  static async takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0] || null;
  }

  /**
   * Pick video from gallery or record
   */
  static async pickVideo(): Promise<ImagePicker.ImagePickerAsset | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 0.8,
      videoMaxDuration: 60, // 60 seconds max
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0] || null;
  }
}


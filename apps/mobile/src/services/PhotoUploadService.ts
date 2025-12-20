/**
 * Enhanced Photo Upload Service for Mobile App
 * Handles before/after photos, video walkthroughs, and photo metadata
 * Uses unified API client for API calls
 */

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '../config/supabase';
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
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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

        const formData = new FormData();
        formData.append('photo', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `before_${Date.now()}.jpg`,
        } as any);
        formData.append('metadata', JSON.stringify(metadata));

        // Get auth token for FormData upload
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/photos/before`, {
          method: 'POST',
          body: formData,
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to upload photo' }));
          const apiError = parseError({
            message: errorData.error || 'Failed to upload photo',
            statusCode: response.status,
          });
          results.push({
            success: false,
            error: getUserFriendlyMessage(apiError),
          });
          continue;
        }

        const data = await response.json();
        results.push({
          success: true,
          photoId: data.photoId,
          url: data.url,
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
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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

        const formData = new FormData();
        formData.append('photo', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `after_${Date.now()}.jpg`,
        } as any);
        formData.append('metadata', JSON.stringify(metadata));

        // Get auth token for FormData upload
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/photos/after`, {
          method: 'POST',
          body: formData,
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to upload photo' }));
          const apiError = parseError({
            message: errorData.error || 'Failed to upload photo',
            statusCode: response.status,
          });
          results.push({
            success: false,
            error: getUserFriendlyMessage(apiError),
          });
          continue;
        }

        const data = await response.json();
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
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    
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
      } as any);
      formData.append('metadata', JSON.stringify(metadata));

      // Get auth token for FormData upload
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/photos/video`, {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to upload video' }));
        const apiError = parseError({
          message: errorData.error || 'Failed to upload video',
          statusCode: response.status,
        });
        return {
          success: false,
          error: getUserFriendlyMessage(apiError),
        };
      }

      const data = await response.json();
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
   * Assess photo quality (simplified - would use actual image analysis in production)
   */
  private static assessPhotoQuality(
    photo: ImagePicker.ImagePickerAsset
  ): 'high' | 'medium' | 'low' {
    // Simplified quality assessment
    // In production, would analyze image sharpness, brightness, etc.
    if (photo.width && photo.height) {
      const megapixels = (photo.width * photo.height) / 1000000;
      if (megapixels >= 8) return 'high';
      if (megapixels >= 2) return 'medium';
    }
    return 'low';
  }

  /**
   * Pick images from camera or gallery
   */
  static async pickImages(
    allowsMultiple: boolean = true
  ): Promise<ImagePicker.ImagePickerAsset[]> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
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


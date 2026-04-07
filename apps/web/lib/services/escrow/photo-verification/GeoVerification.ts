import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type {
  GeolocationResult,
  TimestampResult,
  Location,
  PhotoMetadata,
} from './types';

// Geolocation thresholds
const MAX_DISTANCE_METERS = 100;
const MAX_GPS_ACCURACY = 50;

// Timestamp thresholds
const MAX_TIMESTAMP_AGE_HOURS = 24;

export class GeoVerification {
  static readonly MAX_DISTANCE_METERS = MAX_DISTANCE_METERS;
  static readonly MAX_GPS_ACCURACY = MAX_GPS_ACCURACY;
  static readonly MAX_TIMESTAMP_AGE_HOURS = MAX_TIMESTAMP_AGE_HOURS;
  static readonly TIMESTAMP_TOLERANCE_MS = 2 * 60 * 60 * 1000; // 2 hours tolerance

  static async verifyGeolocation(
    photoUrl: string,
    jobLocation: Location,
    photoGeolocation?: { lat: number; lng: number; accuracy?: number }
  ): Promise<GeolocationResult> {
    try {
      if (!photoGeolocation) {
        // Try to extract geolocation from photo metadata
        const metadata = await this.getPhotoMetadata(photoUrl);
        photoGeolocation = metadata.geolocation;
      }

      if (!photoGeolocation) {
        return {
          verified: false,
          distance: Infinity,
          accuracy: Infinity,
          withinThreshold: false,
        };
      }

      // Calculate distance using Haversine formula
      const distance = this.calculateDistance(
        jobLocation.lat,
        jobLocation.lng,
        photoGeolocation.lat,
        photoGeolocation.lng
      );

      const accuracy = photoGeolocation.accuracy || 0;
      const withinThreshold =
        distance <= MAX_DISTANCE_METERS && accuracy <= MAX_GPS_ACCURACY;

      return {
        verified: withinThreshold,
        distance,
        accuracy,
        withinThreshold,
      };
    } catch (error) {
      logger.error('Error verifying geolocation', error, {
        service: 'PhotoVerificationService',
        photoUrl,
      });
      return {
        verified: false,
        distance: Infinity,
        accuracy: Infinity,
        withinThreshold: false,
      };
    }
  }

  static async verifyTimestamp(
    photoUrl: string,
    expectedTimeWindow?: { start: Date; end: Date }
  ): Promise<TimestampResult> {
    try {
      const metadata = await this.getPhotoMetadata(photoUrl);
      const timestamp = metadata.timestamp || new Date();

      let isRecent = true;
      let timeDifference = 0;

      if (expectedTimeWindow) {
        timeDifference =
          timestamp.getTime() - expectedTimeWindow.start.getTime();
        isRecent =
          timestamp >= expectedTimeWindow.start &&
          timestamp <= expectedTimeWindow.end;
      } else {
        // Check if photo is recent (within MAX_TIMESTAMP_AGE_HOURS)
        const now = Date.now();
        const ageHours = (now - timestamp.getTime()) / (1000 * 60 * 60);

        // Reject future timestamps (security: prevents timestamp manipulation)
        if (timestamp.getTime() > now) {
          return {
            verified: false,
            timestamp,
            isRecent: false,
            timeDifference: timestamp.getTime() - now,
          };
        }

        isRecent = ageHours <= MAX_TIMESTAMP_AGE_HOURS && ageHours >= 0;
        timeDifference = now - timestamp.getTime();
      }

      return {
        verified: isRecent,
        timestamp,
        isRecent,
        timeDifference,
      };
    } catch (error) {
      logger.error('Error verifying timestamp', error, {
        service: 'PhotoVerificationService',
        photoUrl,
      });
      return {
        verified: false,
        timestamp: new Date(),
        isRecent: false,
        timeDifference: Infinity,
      };
    }
  }

  static async checkGeolocationConsistency(
    beforeUrls: string[],
    afterUrls: string[],
    jobLocation: Location
  ): Promise<boolean> {
    try {
      const allUrls = [...beforeUrls, ...afterUrls];
      let verifiedCount = 0;
      let failedCount = 0;

      for (const url of allUrls) {
        const metadata = await this.getPhotoMetadata(url);
        if (metadata.geolocation) {
          const distance = this.calculateDistance(
            jobLocation.lat,
            jobLocation.lng,
            metadata.geolocation.lat,
            metadata.geolocation.lng
          );
          if (distance <= MAX_DISTANCE_METERS) {
            verifiedCount++;
          } else {
            failedCount++;
          }
        }
      }

      // If no photos have geolocation, we can't verify consistency
      if (verifiedCount === 0 && failedCount === 0) {
        return false;
      }

      // Pass if majority of geolocated photos are within threshold
      return failedCount === 0 || verifiedCount > failedCount;
    } catch (error) {
      logger.error('Error checking geolocation consistency', error, {
        service: 'PhotoVerificationService',
      });
      return false;
    }
  }

  static async getPhotoMetadata(photoUrl: string): Promise<PhotoMetadata> {
    // In a real implementation, this would extract EXIF data from images
    // For now, check if metadata exists in database
    try {
      const { data } = await serverSupabase
        .from('job_photos_metadata')
        .select('geolocation, timestamp')
        .eq('photo_url', photoUrl)
        .single();

      if (data) {
        return {
          geolocation: data.geolocation as
            | { lat: number; lng: number; accuracy?: number }
            | undefined,
          timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
        };
      }
    } catch (error) {
      logger.warn('Could not fetch photo metadata from database', {
        service: 'PhotoVerificationService',
        photoUrl,
      });
    }

    return {};
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}

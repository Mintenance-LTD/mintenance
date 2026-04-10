export type { Photo } from './photo-verification/types';

import type {
  PhotoQualityResult,
  ComparisonResult,
  GeolocationResult,
  TimestampResult,
  ValidationResult,
  Photo,
  Location,
} from './photo-verification/types';

import { VerificationRules } from './photo-verification/VerificationRules';
import { GeoVerification } from './photo-verification/GeoVerification';

/**
 * Service for comprehensive photo verification including quality checks,
 * before/after comparison, geolocation, and timestamp verification
 */
export class PhotoVerificationService {
  static async validatePhotoQuality(
    photoUrl: string
  ): Promise<PhotoQualityResult> {
    return VerificationRules.validatePhotoQuality(photoUrl);
  }

  static async compareBeforeAfter(
    beforeUrls: string[],
    afterUrls: string[],
    jobLocation: Location
  ): Promise<ComparisonResult> {
    return VerificationRules.compareBeforeAfter(
      beforeUrls,
      afterUrls,
      jobLocation
    );
  }

  static async verifyGeolocation(
    photoUrl: string,
    jobLocation: Location,
    photoGeolocation?: { lat: number; lng: number; accuracy?: number }
  ): Promise<GeolocationResult> {
    return GeoVerification.verifyGeolocation(
      photoUrl,
      jobLocation,
      photoGeolocation
    );
  }

  static async verifyTimestamp(
    photoUrl: string,
    expectedTimeWindow?: { start: Date; end: Date }
  ): Promise<TimestampResult> {
    return GeoVerification.verifyTimestamp(photoUrl, expectedTimeWindow);
  }

  static async validatePhotoRequirements(
    jobCategory: string,
    photos: Photo[]
  ): Promise<ValidationResult> {
    return VerificationRules.validatePhotoRequirements(jobCategory, photos);
  }

  static checkMinimumAngles(photos: Photo[]): boolean {
    return VerificationRules.checkMinimumAngles(photos);
  }
}

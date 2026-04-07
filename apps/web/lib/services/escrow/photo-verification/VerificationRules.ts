import { logger } from '@mintenance/shared';
import type {
  PhotoQualityResult,
  ComparisonResult,
  ValidationResult,
  Photo,
  Location,
} from './types';
import { ImageAnalyzer } from './ImageAnalyzer';
import { GeoVerification } from './GeoVerification';

// Quality thresholds
const MIN_BRIGHTNESS = 0.3;
const MIN_SHARPNESS = 0.5;
const MIN_RESOLUTION = { width: 800, height: 600 };
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Category-specific requirements
const CATEGORY_REQUIREMENTS: Record<
  string,
  {
    minPhotos: number;
    requiredAngles: string[];
    specificChecks: string[];
  }
> = {
  plumbing: {
    minPhotos: 3,
    requiredAngles: ['close-up', 'wide'],
    specificChecks: ['connection_points', 'water_flow'],
  },
  electrical: {
    minPhotos: 3,
    requiredAngles: ['close-up', 'wide'],
    specificChecks: ['wiring', 'connections', 'safety'],
  },
  painting: {
    minPhotos: 3,
    requiredAngles: ['wide', 'close-up'],
    specificChecks: ['coverage', 'finish_quality'],
  },
  general: {
    minPhotos: 3,
    requiredAngles: ['wide'],
    specificChecks: [],
  },
};

export class VerificationRules {
  static readonly MIN_BRIGHTNESS = MIN_BRIGHTNESS;
  static readonly MIN_SHARPNESS = MIN_SHARPNESS;
  static readonly MIN_RESOLUTION = MIN_RESOLUTION;
  static readonly MAX_FILE_SIZE = MAX_FILE_SIZE;
  static readonly CATEGORY_REQUIREMENTS = CATEGORY_REQUIREMENTS;

  static async validatePhotoQuality(
    photoUrl: string
  ): Promise<PhotoQualityResult> {
    try {
      // Fetch image metadata
      const imageInfo = await ImageAnalyzer.getImageInfo(photoUrl);

      const issues: string[] = [];
      let qualityScore = 1.0;

      // Check brightness
      const brightness = imageInfo.brightness || 0.5;
      if (brightness < MIN_BRIGHTNESS) {
        issues.push(`Photo too dark (brightness: ${brightness.toFixed(2)})`);
        qualityScore -= 0.3;
      }

      // Check sharpness (blur detection)
      const sharpness = imageInfo.sharpness || 0.7;
      if (sharpness < MIN_SHARPNESS) {
        issues.push(`Photo too blurry (sharpness: ${sharpness.toFixed(2)})`);
        qualityScore -= 0.3;
      }

      // Check resolution
      const resolution = imageInfo.resolution || { width: 0, height: 0 };
      if (
        resolution.width < MIN_RESOLUTION.width ||
        resolution.height < MIN_RESOLUTION.height
      ) {
        issues.push(
          `Photo resolution too low (${resolution.width}x${resolution.height})`
        );
        qualityScore -= 0.2;
      }

      // Check file size
      if (imageInfo.fileSize && imageInfo.fileSize > MAX_FILE_SIZE) {
        issues.push(
          `Photo file too large (${(imageInfo.fileSize / 1024 / 1024).toFixed(2)}MB)`
        );
        qualityScore -= 0.1;
      }

      qualityScore = Math.max(0, Math.min(1, qualityScore));

      return {
        passed: issues.length === 0 && qualityScore >= 0.7,
        qualityScore,
        brightness,
        sharpness,
        resolution,
        issues,
      };
    } catch (error) {
      logger.error('Error validating photo quality', error, {
        service: 'PhotoVerificationService',
        photoUrl,
      });
      return {
        passed: false,
        qualityScore: 0,
        brightness: 0,
        sharpness: 0,
        resolution: { width: 0, height: 0 },
        issues: ['Failed to analyze photo'],
      };
    }
  }

  static async compareBeforeAfter(
    beforeUrls: string[],
    afterUrls: string[],
    jobLocation: Location
  ): Promise<ComparisonResult> {
    try {
      if (beforeUrls.length === 0 || afterUrls.length === 0) {
        return {
          comparisonScore: 0,
          matches: false,
          differences: ['Missing before or after photos'],
          confidence: 0,
        };
      }

      // Use AI to compare before/after photos
      const aiComparison = await ImageAnalyzer.compareWithAI(
        beforeUrls,
        afterUrls,
        jobLocation
      );

      // Check geolocation consistency
      const geolocationMatch =
        await GeoVerification.checkGeolocationConsistency(
          beforeUrls,
          afterUrls,
          jobLocation
        );

      // Calculate overall comparison score
      const comparisonScore =
        aiComparison.score * 0.7 + (geolocationMatch ? 0.3 : 0);
      const matches = comparisonScore >= 0.6;

      return {
        comparisonScore,
        matches,
        differences: aiComparison.differences,
        confidence: comparisonScore,
      };
    } catch (error) {
      logger.error('Error comparing before/after photos', error, {
        service: 'PhotoVerificationService',
      });
      return {
        comparisonScore: 0,
        matches: false,
        differences: ['Failed to compare photos'],
        confidence: 0,
      };
    }
  }

  static async validatePhotoRequirements(
    jobCategory: string,
    photos: Photo[]
  ): Promise<ValidationResult> {
    const requirements =
      CATEGORY_REQUIREMENTS[jobCategory.toLowerCase()] ||
      CATEGORY_REQUIREMENTS.general;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum number of photos
    if (photos.length < requirements.minPhotos) {
      errors.push(
        `Minimum ${requirements.minPhotos} photos required, got ${photos.length}`
      );
    }

    // Check required angles
    const angleTypes = photos
      .map((p) => p.angleType)
      .filter(Boolean) as string[];
    const missingAngles = requirements.requiredAngles.filter(
      (angle) => !angleTypes.includes(angle)
    );
    if (missingAngles.length > 0) {
      errors.push(`Missing required angles: ${missingAngles.join(', ')}`);
    }

    // Check photo quality
    for (const photo of photos) {
      if (photo.qualityScore !== undefined && photo.qualityScore < 0.7) {
        warnings.push(
          `Photo ${photo.url} has low quality score: ${photo.qualityScore.toFixed(2)}`
        );
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      requirements: {
        minPhotos: requirements.minPhotos,
        requiredAngles: requirements.requiredAngles,
        categorySpecific: {
          specificChecks: requirements.specificChecks,
        },
      },
    };
  }

  static checkMinimumAngles(photos: Photo[]): boolean {
    const angleTypes = new Set(photos.map((p) => p.angleType).filter(Boolean));
    return angleTypes.size >= 2; // At least 2 different angles
  }
}

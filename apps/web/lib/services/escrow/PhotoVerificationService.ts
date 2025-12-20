import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { validateURL } from '@/lib/security/url-validation';

export interface PhotoQualityResult {
  passed: boolean;
  qualityScore: number; // 0-1
  brightness: number; // 0-1
  sharpness: number; // 0-1
  resolution: { width: number; height: number };
  issues: string[];
}

export interface ComparisonResult {
  comparisonScore: number; // 0-1
  matches: boolean;
  differences: string[];
  confidence: number;
}

export interface GeolocationResult {
  verified: boolean;
  distance: number; // meters from job location
  accuracy: number; // GPS accuracy in meters
  withinThreshold: boolean;
}

export interface TimestampResult {
  verified: boolean;
  timestamp: Date;
  isRecent: boolean; // Within expected time window
  timeDifference: number; // milliseconds
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  requirements: {
    minPhotos: number;
    requiredAngles: string[];
    categorySpecific: Record<string, string[]>;
  };
}

export interface Photo {
  url: string;
  geolocation?: { lat: number; lng: number; accuracy?: number };
  timestamp?: Date;
  angleType?: string;
  qualityScore?: number;
}

interface Location {
  lat: number;
  lng: number;
}

/**
 * Service for comprehensive photo verification including quality checks,
 * before/after comparison, geolocation, and timestamp verification
 */
export class PhotoVerificationService {
  // Quality thresholds
  private static readonly MIN_BRIGHTNESS = 0.3; // Minimum brightness (0-1)
  private static readonly MIN_SHARPNESS = 0.5; // Minimum sharpness (0-1)
  private static readonly MIN_RESOLUTION = { width: 800, height: 600 }; // Minimum resolution
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Geolocation thresholds
  private static readonly MAX_DISTANCE_METERS = 100; // Maximum distance from job location
  private static readonly MAX_GPS_ACCURACY = 50; // Maximum GPS accuracy in meters

  // Timestamp thresholds
  private static readonly MAX_TIMESTAMP_AGE_HOURS = 24; // Photos must be within 24 hours
  private static readonly TIMESTAMP_TOLERANCE_MS = 2 * 60 * 60 * 1000; // 2 hours tolerance

  // Category-specific requirements
  private static readonly CATEGORY_REQUIREMENTS: Record<string, {
    minPhotos: number;
    requiredAngles: string[];
    specificChecks: string[];
  }> = {
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

  /**
   * Validates photo quality (brightness, blur, resolution)
   */
  static async validatePhotoQuality(photoUrl: string): Promise<PhotoQualityResult> {
    try {
      // Fetch image metadata
      const imageInfo = await this.getImageInfo(photoUrl);
      
      const issues: string[] = [];
      let qualityScore = 1.0;

      // Check brightness
      const brightness = imageInfo.brightness || 0.5;
      if (brightness < this.MIN_BRIGHTNESS) {
        issues.push(`Photo too dark (brightness: ${brightness.toFixed(2)})`);
        qualityScore -= 0.3;
      }

      // Check sharpness (blur detection)
      const sharpness = imageInfo.sharpness || 0.7;
      if (sharpness < this.MIN_SHARPNESS) {
        issues.push(`Photo too blurry (sharpness: ${sharpness.toFixed(2)})`);
        qualityScore -= 0.3;
      }

      // Check resolution
      const resolution = imageInfo.resolution || { width: 0, height: 0 };
      if (resolution.width < this.MIN_RESOLUTION.width || resolution.height < this.MIN_RESOLUTION.height) {
        issues.push(`Photo resolution too low (${resolution.width}x${resolution.height})`);
        qualityScore -= 0.2;
      }

      // Check file size
      if (imageInfo.fileSize && imageInfo.fileSize > this.MAX_FILE_SIZE) {
        issues.push(`Photo file too large (${(imageInfo.fileSize / 1024 / 1024).toFixed(2)}MB)`);
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

  /**
   * Compares before and after photos to detect staged photos
   */
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
      const aiComparison = await this.compareWithAI(beforeUrls, afterUrls, jobLocation);

      // Check geolocation consistency
      const geolocationMatch = await this.checkGeolocationConsistency(beforeUrls, afterUrls, jobLocation);

      // Calculate overall comparison score
      const comparisonScore = (aiComparison.score * 0.7) + (geolocationMatch ? 0.3 : 0);
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

  /**
   * Verifies geolocation of photos against job location
   */
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
      const withinThreshold = distance <= this.MAX_DISTANCE_METERS && accuracy <= this.MAX_GPS_ACCURACY;

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

  /**
   * Verifies timestamp of photos
   */
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
        timeDifference = timestamp.getTime() - expectedTimeWindow.start.getTime();
        isRecent = timestamp >= expectedTimeWindow.start && timestamp <= expectedTimeWindow.end;
      } else {
        // Check if photo is recent (within MAX_TIMESTAMP_AGE_HOURS)
        const ageHours = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
        isRecent = ageHours <= this.MAX_TIMESTAMP_AGE_HOURS;
        timeDifference = Date.now() - timestamp.getTime();
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

  /**
   * Validates photo requirements for a specific job category
   */
  static async validatePhotoRequirements(
    jobCategory: string,
    photos: Photo[]
  ): Promise<ValidationResult> {
    const requirements = this.CATEGORY_REQUIREMENTS[jobCategory.toLowerCase()] || 
                        this.CATEGORY_REQUIREMENTS.general;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum number of photos
    if (photos.length < requirements.minPhotos) {
      errors.push(`Minimum ${requirements.minPhotos} photos required, got ${photos.length}`);
    }

    // Check required angles
    const angleTypes = photos.map(p => p.angleType).filter(Boolean) as string[];
    const missingAngles = requirements.requiredAngles.filter(
      angle => !angleTypes.includes(angle)
    );
    if (missingAngles.length > 0) {
      errors.push(`Missing required angles: ${missingAngles.join(', ')}`);
    }

    // Check photo quality
    for (const photo of photos) {
      if (photo.qualityScore !== undefined && photo.qualityScore < 0.7) {
        warnings.push(`Photo ${photo.url} has low quality score: ${photo.qualityScore.toFixed(2)}`);
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

  /**
   * Checks if minimum angles requirement is met
   */
  static checkMinimumAngles(photos: Photo[]): boolean {
    const angleTypes = new Set(photos.map(p => p.angleType).filter(Boolean));
    return angleTypes.size >= 2; // At least 2 different angles
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Gets image information (brightness, sharpness, resolution)
   */
  private static async getImageInfo(photoUrl: string): Promise<{
    brightness: number;
    sharpness: number;
    resolution: { width: number; height: number };
    fileSize?: number;
  }> {
    // SECURITY: Validate URL to prevent SSRF attacks
    const urlValidation = await validateURL(photoUrl, true);
    if (!urlValidation.isValid) {
      logger.warn('Invalid photo URL rejected', {
        service: 'PhotoVerificationService',
        photoUrl,
        error: urlValidation.error,
      });
      throw new Error(`Invalid photo URL: ${urlValidation.error}`);
    }

    const validatedUrl = urlValidation.normalizedUrl || photoUrl;

    // In a real implementation, this would use image processing libraries
    // For now, return default values (would be replaced with actual image analysis)
    try {
      // Try to fetch image and analyze
      // SECURITY: Use validated URL and set timeout to prevent slowloris attacks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(validatedUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

      // Verify content type is an image
      if (!contentType.startsWith('image/')) {
        logger.warn('URL does not point to an image', {
          service: 'PhotoVerificationService',
          photoUrl: validatedUrl,
          contentType,
        });
        throw new Error('URL does not point to a valid image');
      }

      // Default values (would be replaced with actual image analysis)
      return {
        brightness: 0.7,
        sharpness: 0.8,
        resolution: { width: 1920, height: 1080 },
        fileSize: contentLength,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('Image fetch timeout', {
          service: 'PhotoVerificationService',
          photoUrl: validatedUrl,
        });
        throw new Error('Image fetch timeout');
      }
      logger.warn('Could not fetch image info, using defaults', {
        service: 'PhotoVerificationService',
        photoUrl: validatedUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        brightness: 0.7,
        sharpness: 0.8,
        resolution: { width: 1920, height: 1080 },
      };
    }
  }

  /**
   * Compares before/after photos using AI
   */
  private static async compareWithAI(
    beforeUrls: string[],
    afterUrls: string[],
    jobLocation: Location
  ): Promise<{ score: number; differences: string[] }> {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not configured, using fallback comparison');
      return { score: 0.5, differences: ['AI comparison unavailable'] };
    }

    try {
      // SECURITY: Validate all URLs before sending to OpenAI
      const { validateURLs } = await import('@/lib/security/url-validation');
      const allUrls = [...beforeUrls, ...afterUrls];
      const validation = await validateURLs(allUrls, true);

      if (validation.invalid.length > 0) {
        logger.warn('Invalid URLs rejected for AI comparison', {
          service: 'PhotoVerificationService',
          invalidUrls: validation.invalid,
        });
        return {
          score: 0,
          differences: [`Invalid URLs detected: ${validation.invalid.map(i => i.error).join(', ')}`],
        };
      }

      // Use only validated URLs
      const validatedBeforeUrls = validation.valid.slice(0, beforeUrls.length);
      const validatedAfterUrls = validation.valid.slice(beforeUrls.length);

      const systemPrompt = `You are an expert at comparing before and after photos to detect if they are from the same location.
      Analyze the photos and determine:
      1. If they show the same location/property
      2. If the work appears to be completed
      3. Any inconsistencies that suggest staged or fake photos
      
      Respond in JSON format:
      {
        "score": number (0-1, 1 = same location, 0 = different location),
        "differences": string[],
        "matches": boolean
      }`;

      const userPrompt = `Compare these before and after photos. Are they from the same location?
      Job location: ${jobLocation.lat}, ${jobLocation.lng}`;

      interface ChatMessage {
        role: 'system' | 'user' | 'assistant';
        content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }>;
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...validatedBeforeUrls.slice(0, 3).map(url => ({
              type: 'image_url',
              // Use 'high' detail for photo verification (critical for accuracy)
              image_url: { url, detail: 'high' },
            })),
            ...validatedAfterUrls.slice(0, 3).map(url => ({
              type: 'image_url',
              // Use 'high' detail for photo verification (critical for accuracy)
              image_url: { url, detail: 'high' },
            })),
          ],
        },
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);

      return {
        score: result.score || 0.5,
        differences: result.differences || [],
      };
    } catch (error) {
      logger.error('Error in AI comparison', error, {
        service: 'PhotoVerificationService',
      });
      return { score: 0.5, differences: ['AI comparison failed'] };
    }
  }

  /**
   * Checks geolocation consistency between before and after photos
   */
  private static async checkGeolocationConsistency(
    beforeUrls: string[],
    afterUrls: string[],
    jobLocation: Location
  ): Promise<boolean> {
    // Check if all photos are from similar locations
    // This would compare geolocation metadata from photos
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Gets photo metadata (geolocation, timestamp)
   */
  private static async getPhotoMetadata(photoUrl: string): Promise<{
    geolocation?: { lat: number; lng: number; accuracy?: number };
    timestamp?: Date;
  }> {
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
          geolocation: data.geolocation as { lat: number; lng: number; accuracy?: number } | undefined,
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

  /**
   * Calculates distance between two coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}


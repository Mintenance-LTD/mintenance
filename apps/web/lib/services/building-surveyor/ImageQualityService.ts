/**
 * Image Quality Service
 *
 * Extracts image quality metrics for use in context features:
 * - Lighting quality (brightness histogram analysis)
 * - Image clarity (edge detection, sharpness)
 * - Blur score (Laplacian variance)
 *
 * These metrics help the Safe-LUCB critic make better automation decisions.
 */

import { logger } from '@mintenance/shared';
import type { VisionAnalysisSummary } from './types';

interface ImageQualityMetrics {
  lightingQuality: number; // 0-1, higher = better lighting
  imageClarity: number; // 0-1, higher = sharper image
  blurScore: number; // 0-1, higher = more blur (inverse of clarity)
  averageBrightness: number; // 0-1, normalized brightness
  contrast: number; // 0-1, higher = more contrast
}

export class ImageQualityService {
  /**
   * Extract quality metrics from image URLs
   *
   * For now, uses heuristics based on ImageAnalysisService results.
   * In production, could use image processing libraries or cloud services.
   */
  static async extractQualityMetrics(
    imageUrls: string[],
    visionAnalysis: VisionAnalysisSummary | null
  ): Promise<ImageQualityMetrics> {
    try {
      // If we have vision analysis, use it to infer quality
      if (visionAnalysis) {
        return this.inferQualityFromVisionAnalysis(visionAnalysis);
      }

      // Fallback: use heuristics based on image count and metadata
      // In a real implementation, you would:
      // 1. Fetch image data
      // 2. Compute brightness histogram
      // 3. Apply edge detection (Sobel, Canny)
      // 4. Compute Laplacian variance for blur detection

      // For now, return conservative defaults
      logger.debug(
        'No vision analysis available, using default quality metrics',
        {
          service: 'ImageQualityService',
          imageCount: imageUrls.length,
        }
      );

      return {
        lightingQuality: 0.7, // Conservative estimate
        imageClarity: 0.7,
        blurScore: 0.3,
        averageBrightness: 0.5,
        contrast: 0.5,
      };
    } catch (error) {
      logger.warn('Failed to extract image quality metrics', {
        service: 'ImageQualityService',
        error,
      });

      // Return conservative defaults on error
      return {
        lightingQuality: 0.5,
        imageClarity: 0.5,
        blurScore: 0.5,
        averageBrightness: 0.5,
        contrast: 0.5,
      };
    }
  }

  /**
   * Infer quality metrics from Google Vision API analysis results
   */
  private static inferQualityFromVisionAnalysis(
    visionAnalysis: VisionAnalysisSummary
  ): ImageQualityMetrics {
    // Use confidence and detected features to infer quality
    const confidence = visionAnalysis.confidence || 0.5;

    // Higher confidence suggests better image quality
    const baseQuality = Math.min(1.0, confidence * 1.2); // Scale up slightly

    // More detected features suggests clearer image
    const featureCount = visionAnalysis.detectedFeatures?.length || 0;
    const clarityBoost = Math.min(0.2, featureCount / 20); // Up to 0.2 boost

    const textBoost = 0;

    const imageClarity = Math.min(1.0, baseQuality + clarityBoost + textBoost);

    // Lighting quality: infer from condition and confidence
    // Better condition = better lighting (generally)
    const conditionMultiplier: Record<string, number> = {
      excellent: 0.9,
      good: 0.8,
      fair: 0.6,
      poor: 0.4,
    };
    const condition = visionAnalysis.condition || 'fair';
    const lightingQuality =
      (conditionMultiplier[condition] || 0.6) * baseQuality;

    // Blur score: inverse of clarity
    const blurScore = 1.0 - imageClarity;

    // Average brightness: use confidence as proxy (higher confidence = better exposure)
    const averageBrightness = Math.min(1.0, confidence * 0.8 + 0.2);

    // Contrast: infer from complexity (more complex = potentially more contrast)
    const complexityMultiplier: Record<string, number> = {
      complex: 0.8,
      moderate: 0.6,
      simple: 0.4,
    };
    const complexity = visionAnalysis.complexity || 'moderate';
    const contrast = (complexityMultiplier[complexity] || 0.6) * baseQuality;

    return {
      lightingQuality: Math.max(0, Math.min(1, lightingQuality)),
      imageClarity: Math.max(0, Math.min(1, imageClarity)),
      blurScore: Math.max(0, Math.min(1, blurScore)),
      averageBrightness: Math.max(0, Math.min(1, averageBrightness)),
      contrast: Math.max(0, Math.min(1, contrast)),
    };
  }

  /**
   * Compute quality metrics from image data (for future implementation)
   *
   * This would require:
   * 1. Fetching image data (Buffer or ImageData)
   * 2. Computing brightness histogram
   * 3. Applying edge detection
   * 4. Computing Laplacian variance for blur
   */
  static async computeQualityFromImageData(
    imageData: Buffer | ImageData
  ): Promise<ImageQualityMetrics> {
    try {
      // Dynamic import to avoid client-side bundling issues.
      // sharp is listed in next.config.js serverExternalPackages.
      const sharp = (await import('sharp')).default;

      const inputBuffer =
        imageData instanceof Buffer
          ? imageData
          : Buffer.from(
              (imageData as unknown as { data: ArrayBuffer })
                .data as unknown as Uint8Array
            );

      const image = sharp(inputBuffer);

      // 1. Get image metadata for resolution info
      const metadata = await image.metadata();

      // 2. Convert to single-channel greyscale for analysis
      const greyscale = image.greyscale();
      const stats = await greyscale.stats();
      const channel = stats.channels[0]; // Single greyscale channel

      // 3. Average brightness: mean pixel value normalised to 0-1
      const averageBrightness = channel.mean / 255;

      // 4. Contrast: standard deviation of pixel values normalised to 0-1
      //    Max possible stdev for 8-bit is ~127.5 (half range)
      const contrast = Math.min(1, channel.stdev / 127.5);

      // 5. Lighting quality: penalise very dark or very bright images.
      //    Optimal brightness is around 0.4-0.6. Score drops as we move away.
      const brightnessDelta = Math.abs(averageBrightness - 0.5);
      const lightingQuality =
        Math.max(0, Math.min(1, 1 - brightnessDelta * 2)) * 0.7 +
        contrast * 0.3; // Good contrast also indicates good lighting

      // 6. Sharpness estimation via Laplacian variance.
      //    Apply a 3x3 Laplacian kernel and measure variance of the result.
      //    Higher variance = sharper image.
      const { data: rawPixels, info } = await greyscale
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = new Uint8Array(rawPixels);
      const width = info.width;
      const height = info.height;

      let laplacianSum = 0;
      let laplacianSumSq = 0;
      let count = 0;

      // Laplacian kernel: [0, 1, 0; 1, -4, 1; 0, 1, 0]
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          const lap =
            pixels[idx - width] + // top
            pixels[idx - 1] + // left
            pixels[idx + 1] + // right
            pixels[idx + width] - // bottom
            4 * pixels[idx]; // center

          laplacianSum += lap;
          laplacianSumSq += lap * lap;
          count++;
        }
      }

      const laplacianMean = count > 0 ? laplacianSum / count : 0;
      const laplacianVariance =
        count > 0 ? laplacianSumSq / count - laplacianMean * laplacianMean : 0;

      // Normalise sharpness: empirically, variance > 1000 is sharp, < 100 is blurry.
      // Use a sigmoid-like mapping for smooth 0-1 range.
      const sharpnessRaw = Math.min(1, Math.max(0, laplacianVariance / 2000));
      const imageClarity = sharpnessRaw;
      const blurScore = 1.0 - imageClarity;

      logger.debug('Image quality computed from pixel data', {
        service: 'ImageQualityService',
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        averageBrightness: averageBrightness.toFixed(3),
        contrast: contrast.toFixed(3),
        laplacianVariance: laplacianVariance.toFixed(1),
        imageClarity: imageClarity.toFixed(3),
      });

      return {
        lightingQuality: Math.max(0, Math.min(1, lightingQuality)),
        imageClarity: Math.max(0, Math.min(1, imageClarity)),
        blurScore: Math.max(0, Math.min(1, blurScore)),
        averageBrightness: Math.max(0, Math.min(1, averageBrightness)),
        contrast: Math.max(0, Math.min(1, contrast)),
      };
    } catch (error) {
      logger.warn(
        'computeQualityFromImageData failed, returning conservative defaults',
        {
          service: 'ImageQualityService',
          error,
        }
      );

      return {
        lightingQuality: 0.5,
        imageClarity: 0.5,
        blurScore: 0.5,
        averageBrightness: 0.5,
        contrast: 0.5,
      };
    }
  }

  /**
   * Get average quality metrics across multiple images
   */
  static async getAverageQualityMetrics(
    imageUrls: string[],
    visionAnalysis: VisionAnalysisSummary | null
  ): Promise<ImageQualityMetrics> {
    const metrics = await this.extractQualityMetrics(imageUrls, visionAnalysis);

    // If we had per-image metrics, we would average them here
    // For now, return the single metrics (already averaged if from vision analysis)
    return metrics;
  }
}

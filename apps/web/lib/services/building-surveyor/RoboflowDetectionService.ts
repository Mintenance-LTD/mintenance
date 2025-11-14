import { logger } from '@mintenance/shared';
import { getRoboflowConfig, validateRoboflowConfig } from '@/lib/config/roboflow.config';
import { validateURLs } from '@/lib/security/url-validation';
import type { RoboflowDetection } from './types';

interface DetectionResponse {
  predictions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
    detection_id?: string;
  }>;
}

/**
 * RoboflowDetectionService
 *
 * Lightweight client for Roboflow hosted inference. Designed to run prior
 * to GPT-4 Vision so that structure detections can be included in prompts
 * and persisted for future re-training.
 */
export class RoboflowDetectionService {
  private static readonly MAX_IMAGES = 8;

  static async detect(imageUrls: string[]): Promise<RoboflowDetection[]> {
    if (!imageUrls.length) {
      return [];
    }

    const config = getRoboflowConfig();
    const validation = validateRoboflowConfig(config);

    if (!validation.valid) {
      logger.warn('Roboflow not configured, skipping detections', {
        service: 'RoboflowDetectionService',
        error: validation.error,
      });
      return [];
    }

    const normalizedUrls = imageUrls.slice(0, this.MAX_IMAGES);
    const urlValidation = await validateURLs(normalizedUrls, true);
    if (urlValidation.invalid.length > 0) {
      logger.warn('Invalid image URLs rejected for Roboflow detection', {
        service: 'RoboflowDetectionService',
        invalidUrls: urlValidation.invalid,
      });
      throw new Error(`Invalid image URLs: ${urlValidation.invalid.map((i) => i.error).join(', ')}`);
    }

    const detections: RoboflowDetection[] = [];
    for (const url of urlValidation.valid) {
      try {
        const response = await this.fetchDetections(url, config);
        const imageDetections = response.predictions.map((prediction) => ({
          id: prediction.detection_id || `${prediction.class}-${prediction.x}-${prediction.y}`,
          className: prediction.class,
          confidence: Math.round(prediction.confidence * 100),
          boundingBox: {
            x: prediction.x,
            y: prediction.y,
            width: prediction.width,
            height: prediction.height,
          },
          imageUrl: url,
        }));
        detections.push(...imageDetections);
      } catch (error) {
        logger.warn('Roboflow detection failed for image', {
          service: 'RoboflowDetectionService',
          imageUrl: url,
          error,
        });
      }
    }

    return detections;
  }

  private static async fetchDetections(
    imageUrl: string,
    config: ReturnType<typeof getRoboflowConfig>,
  ): Promise<DetectionResponse> {
    const searchParams = new URLSearchParams({
      api_key: config.apiKey,
      image: imageUrl,
    });

    const endpoint = `${config.baseUrl}/${config.modelId}/${config.modelVersion}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Roboflow request failed (${response.status}): ${errorText}`);
      }

      return (await response.json()) as DetectionResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}


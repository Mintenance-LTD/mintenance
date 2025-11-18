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
 * Hybrid service supporting both:
 * 1. Roboflow hosted inference (API-based)
 * 2. Local YOLO model inference (ONNX-based)
 *
 * Designed to run prior to GPT-4 Vision so that structure detections
 * can be included in prompts and persisted for future re-training.
 */
export class RoboflowDetectionService {
  private static readonly MAX_IMAGES = 8;
  private static localModelInitialized = false;

  /**
   * Initialize local YOLO model if configured
   * Should be called during application startup
   */
  static async initialize(): Promise<void> {
    const config = getRoboflowConfig();
    if (config.useLocalYOLO && (config.yoloModelPath || config.yoloLoadFromDatabase)) {
      try {
        // Lazy load to avoid bundling onnxruntime-node for client
        const { LocalYOLOInferenceService } = await import('./LocalYOLOInferenceService');
        await LocalYOLOInferenceService.initialize({
          modelPath: config.yoloModelPath,
          loadFromDatabase: config.yoloLoadFromDatabase,
          databaseModelName: config.yoloDatabaseModelName,
          dataYamlPath: config.yoloDataYamlPath,
          confidenceThreshold: config.yoloConfidenceThreshold,
          iouThreshold: config.yoloIouThreshold,
          useGPU: true, // Try GPU first, fallback to CPU
        });
        this.localModelInitialized = true;
        logger.info('Local YOLO model initialized in RoboflowDetectionService', {
          service: 'RoboflowDetectionService',
        });
      } catch (error) {
        logger.error('Failed to initialize local YOLO model, will fallback to API', {
          service: 'RoboflowDetectionService',
          error,
        });
        // Don't throw - allow fallback to API
      }
    }
  }

  static async detect(imageUrls: string[]): Promise<RoboflowDetection[]> {
    if (!imageUrls.length) {
      return [];
    }

    const config = getRoboflowConfig();

    // Use local inference if configured and available
    if (config.useLocalYOLO && this.localModelInitialized) {
      try {
        // Lazy load to avoid bundling onnxruntime-node for client
        const { LocalYOLOInferenceService } = await import('./LocalYOLOInferenceService');
        
        if (!LocalYOLOInferenceService.isAvailable()) {
          throw new Error('Local YOLO service not available');
        }

        const normalizedUrls = imageUrls.slice(0, this.MAX_IMAGES);
        const urlValidation = await validateURLs(normalizedUrls, true);
        if (urlValidation.invalid.length > 0) {
          logger.warn('Invalid image URLs rejected for local YOLO detection', {
            service: 'RoboflowDetectionService',
            invalidUrls: urlValidation.invalid,
          });
          throw new Error(`Invalid image URLs: ${urlValidation.invalid.map((i) => i.error).join(', ')}`);
        }

        return await LocalYOLOInferenceService.detect(urlValidation.valid);
      } catch (error) {
        logger.warn('Local YOLO inference failed, falling back to API', {
          service: 'RoboflowDetectionService',
          error,
        });
        // Fall through to API fallback
      }
    }

    // Fallback to API-based inference
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


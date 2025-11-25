/**
 * SAM 3 Segmentation Service
 * Integrates with Python SAM 3 microservice for precise segmentation
 */

import { logger } from '@mintenance/shared';

export interface SAM3SegmentationRequest {
  image_base64: string;
  text_prompt: string;
  threshold?: number;
}

export interface SAM3SegmentationResponse {
  success: boolean;
  masks: number[][][]; // Pixel masks
  boxes: number[][]; // [x, y, w, h] bounding boxes
  scores: number[]; // Confidence scores
  num_instances: number;
}

export interface DamageTypeSegmentation {
  success: boolean;
  damage_types: Record<
    string,
    {
      masks: number[][][];
      boxes: number[][];
      scores: number[];
      num_instances: number;
      error?: string;
    }
  >;
}

export interface SAM3HealthResponse {
  status: string;
  model_loaded: boolean;
  service: string;
}

export class SAM3Service {
  private static readonly BASE_URL =
    process.env.SAM3_SERVICE_URL || 'http://localhost:8001';

  private static readonly TIMEOUT_MS = 30000; // 30 seconds

  /**
   * Check if SAM 3 service is available
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return false;

      const data = (await response.json()) as SAM3HealthResponse;
      return data.status === 'healthy' && data.model_loaded === true;
    } catch (error) {
      logger.warn('SAM3Service health check failed', {
        service: 'sam3-service',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Segment image based on text prompt
   */
  static async segment(
    imageUrl: string,
    textPrompt: string,
    threshold: number = 0.5
  ): Promise<SAM3SegmentationResponse | null> {
    try {
      // Download and convert image to base64
      const imageBase64 = await this.imageUrlToBase64(imageUrl);

      const response = await fetch(`${this.BASE_URL}/segment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          text_prompt: textPrompt,
          threshold,
        }),
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({
          detail: 'Unknown error',
        }))) as { detail?: string };
        throw new Error(
          `SAM 3 segmentation failed: ${error.detail || response.statusText}`
        );
      }

      return (await response.json()) as SAM3SegmentationResponse;
    } catch (error) {
      logger.error('SAM3Service segmentation failed', {
        service: 'sam3-service',
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Segment multiple damage types in an image
   */
  static async segmentDamageTypes(
    imageUrl: string,
    damageTypes: string[] = ['water damage', 'crack', 'rot', 'mold']
  ): Promise<DamageTypeSegmentation | null> {
    try {
      const imageBase64 = await this.imageUrlToBase64(imageUrl);

      const response = await fetch(`${this.BASE_URL}/segment-damage-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          damage_types: damageTypes,
        }),
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({
          detail: 'Unknown error',
        }))) as { detail?: string };
        throw new Error(
          `SAM 3 multi-segmentation failed: ${error.detail || response.statusText}`
        );
      }

      return (await response.json()) as DamageTypeSegmentation;
    } catch (error) {
      logger.error('SAM3Service multi-segmentation failed', {
        service: 'sam3-service',
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Convert image URL to base64
   */
  private static async imageUrlToBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      logger.error('SAM3Service failed to convert image to base64', {
        service: 'sam3-service',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}


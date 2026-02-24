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

  private static readonly TIMEOUT_MS = Number(process.env.SAM3_TIMEOUT_MS) || 30000;

  // P0 Security: Shared secret for authenticating requests to SAM3 microservice
  private static readonly AUTH_TOKEN = process.env.SAM3_AUTH_TOKEN || '';

  /**
   * Build authenticated headers for SAM3 requests
   */
  private static getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${this.AUTH_TOKEN}`;
    } else {
      logger.warn('SAM3_AUTH_TOKEN not configured - requests are unauthenticated', {
        service: 'sam3-service',
      });
    }
    return headers;
  }

  // Cache health check results
  private static healthCheckCache: { result: boolean; timestamp: number } | null = null;
  private static readonly HEALTH_CHECK_CACHE_TTL = 60000; // 60 seconds

  // Circuit breaker for failures
  private static failureCount = 0;
  private static lastFailureTime = 0;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private static readonly CIRCUIT_BREAKER_RESET_TIME = 300000; // 5 minutes

  /**
   * Check if SAM 3 should be used based on rollout percentage
   */
  static shouldUseSAM3(): boolean {
    const rollout = Number(process.env.SAM3_ROLLOUT_PERCENTAGE || 0);
    if (rollout === 0) return false;
    if (rollout >= 100) return true;
    return Math.random() * 100 < rollout;
  }

  /**
   * Check if circuit breaker is open
   */
  private static isCircuitBreakerOpen(): boolean {
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.CIRCUIT_BREAKER_RESET_TIME) {
        return true;
      }
      // Reset circuit breaker after timeout
      this.failureCount = 0;
    }
    return false;
  }

  /**
   * Record failure for circuit breaker
   */
  private static recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  /**
   * Reset failure count on success
   */
  private static recordSuccess(): void {
    this.failureCount = 0;
  }

  /**
   * Check if SAM 3 service is available (with caching)
   */
  static async healthCheck(): Promise<boolean> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      logger.warn('SAM3Service circuit breaker is open, skipping health check', {
        service: 'sam3-service',
        failureCount: this.failureCount,
      });
      return false;
    }

    // Check cache
    if (this.healthCheckCache) {
      const age = Date.now() - this.healthCheckCache.timestamp;
      if (age < this.HEALTH_CHECK_CACHE_TTL) {
        return this.healthCheckCache.result;
      }
    }
    try {
      const response = await fetch(`${this.BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return false;

      const data = (await response.json()) as SAM3HealthResponse;
      const result = data.status === 'healthy' && data.model_loaded === true;

      // Cache successful result
      this.healthCheckCache = { result, timestamp: Date.now() };
      this.recordSuccess();

      return result;
    } catch (error) {
      logger.warn('SAM3Service health check failed', {
        service: 'sam3-service',
        error: error instanceof Error ? error.message : String(error),
      });

      // Cache failure result
      this.healthCheckCache = { result: false, timestamp: Date.now() };
      this.recordFailure();

      return false;
    }
  }

  /**
   * Retry a function with exponential backoff
   */
  private static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fn();
        this.recordSuccess();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          logger.info(`SAM3Service retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
            service: 'sam3-service',
            error: lastError.message,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.recordFailure();
    if (lastError) {
      throw lastError;
    }
    return null;
  }

  /**
   * Segment image based on text prompt (with retry logic)
   */
  static async segment(
    imageUrl: string,
    textPrompt: string,
    threshold: number = 0.5
  ): Promise<SAM3SegmentationResponse | null> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      logger.warn('SAM3Service circuit breaker is open, skipping segmentation', {
        service: 'sam3-service',
      });
      return null;
    }

    // Check rollout percentage
    if (!this.shouldUseSAM3()) {
      logger.debug('SAM3Service skipped due to rollout percentage', {
        service: 'sam3-service',
        rollout: process.env.SAM3_ROLLOUT_PERCENTAGE,
      });
      return null;
    }

    try {
      return await this.retryWithBackoff(async () => {
        // Download and convert image to base64
        const imageBase64 = await this.imageUrlToBase64(imageUrl);

        const response = await fetch(`${this.BASE_URL}/segment`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
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
      });
    } catch (error) {
      logger.error('SAM3Service segmentation failed after retries', {
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
        headers: this.getAuthHeaders(),
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


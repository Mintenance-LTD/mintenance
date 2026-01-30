/**
 * Unified AI Service
 *
 * Thin facade that routes requests to focused analyzer modules.
 * All heavy logic lives in ./analyzers/*.
 */

import { logger } from '@mintenance/shared';
import { CostControlService } from './CostControlService';
import { analyzeBuildingDamage } from './analyzers/building-damage-analyzer';
import { analyzeGeneralImage } from './analyzers/general-image-analyzer';
import { analyzeJob } from './analyzers/job-analyzer';

// Re-export all types for backwards compatibility
export type {
  AssessmentDomain,
  AnalysisContext,
  AnalysisResult,
  AIServiceError,
  GeneralImageAnalysis,
  JobAnalysis,
} from './analyzers/types';

import type { AnalysisContext, AnalysisResult } from './analyzers/types';

/**
 * Unified AI Service - Single entry point for all AI operations
 */
export class UnifiedAIService {
  /**
   * Analyze images with appropriate AI service based on context
   */
  static async analyzeImage(
    images: string[],
    context: AnalysisContext
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      if (CostControlService.isEmergencyStopped()) {
        return {
          success: false,
          error: {
            code: 'EMERGENCY_STOP',
            message: 'AI services are currently disabled',
          },
          fallbackUsed: true,
          service: 'none',
        };
      }

      if (!images || images.length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'No images provided',
          },
          fallbackUsed: false,
          service: 'none',
        };
      }

      switch (context.type) {
        case 'building-damage':
          return await analyzeBuildingDamage(images, context, startTime);

        case 'general-image':
          return await analyzeGeneralImage(images, context, startTime);

        case 'job-analysis':
          return await analyzeJob(images, context, startTime);

        default:
          return await analyzeGeneralImage(images, context, startTime);
      }
    } catch (error) {
      logger.error('UnifiedAIService analysis failed', error);

      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        fallbackUsed: true,
        service: 'error',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get current AI service status
   */
  static async getStatus(): Promise<{
    operational: boolean;
    budget: unknown;
    services: Record<string, boolean>;
  }> {
    const budgetStatus = await CostControlService.getBudgetStatus();
    const isEmergencyStopped = CostControlService.isEmergencyStopped();

    return {
      operational: !isEmergencyStopped && budgetStatus.daily.remaining > 0,
      budget: budgetStatus,
      services: {
        'building-surveyor': !isEmergencyStopped && !!process.env.OPENAI_API_KEY,
        'image-analysis': !isEmergencyStopped && !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        'job-analysis': !isEmergencyStopped && !!process.env.OPENAI_API_KEY,
        'fallback': true,
      },
    };
  }
}

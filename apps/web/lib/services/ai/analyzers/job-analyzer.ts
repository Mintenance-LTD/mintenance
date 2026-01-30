/**
 * Job analysis using GPT-4 Vision with cost control and fallback.
 */

import { logger } from '@mintenance/shared';
import { CostControlService } from '../CostControlService';
import { callGPT4Vision } from './gpt4-vision-client';
import type { AnalysisContext, AnalysisResult, JobAnalysis } from './types';

/**
 * Analyze job from images and description.
 */
export async function analyzeJob(
  images: string[],
  _context: AnalysisContext,
  startTime: number
): Promise<AnalysisResult<JobAnalysis>> {
  try {
    const estimatedCost = CostControlService.estimateCost('gpt-4o', {
      inputTokens: 1000 + images.length * 300,
      outputTokens: 500,
    });

    const budgetCheck = await CostControlService.checkBudget({
      service: 'job-analysis',
      model: 'gpt-4o',
      estimatedCost,
    });

    if (!budgetCheck.allowed) {
      return {
        success: false,
        error: {
          code: 'BUDGET_EXCEEDED',
          message: budgetCheck.reason || 'Budget exceeded',
        },
        fallbackUsed: false,
        service: 'job-analysis',
        processingTime: Date.now() - startTime,
      };
    }

    const response = await callGPT4Vision(
      images,
      'Analyze these images and provide a job assessment including category, urgency, estimated duration, required skills, suggested price range, complexity level, safety considerations, and materials needed. Return as JSON.',
      'job-analysis'
    );

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data as JobAnalysis,
        fallbackUsed: false,
        cost: response.cost,
        service: 'job-analysis',
        model: 'gpt-4o',
        processingTime: Date.now() - startTime,
      };
    }

    return {
      success: true,
      data: generateFallbackJobAnalysis(),
      fallbackUsed: true,
      cost: 0,
      service: 'fallback',
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('Job analysis failed', error);

    return {
      success: true,
      data: generateFallbackJobAnalysis(),
      fallbackUsed: true,
      cost: 0,
      service: 'fallback',
      processingTime: Date.now() - startTime,
    };
  }
}

export function generateFallbackJobAnalysis(): JobAnalysis {
  return {
    category: 'general-maintenance',
    urgency: 'medium',
    estimatedDuration: 4,
    requiredSkills: ['general-contractor'],
    suggestedPrice: {
      min: 100,
      max: 500,
      currency: 'USD',
    },
    complexity: 'moderate',
    safetyConsiderations: ['Wear appropriate PPE'],
    materialsNeeded: ['To be determined on-site'],
  };
}

/**
 * Unified AI Service
 *
 * Consolidates all AI analysis capabilities into a single service.
 * Routes requests to appropriate implementations based on context.
 * Provides consistent error handling and fallback mechanisms.
 */

import { logger } from '@mintenance/shared';
import { CostControlService } from './CostControlService';
import { BuildingSurveyorService } from '../building-surveyor/BuildingSurveyorService';
import { ImageAnalysisService } from '../ImageAnalysisService';
import { fetchWithOpenAIRetry } from '@/lib/utils/openai-rate-limit';
import type { Phase1BuildingAssessment } from '../building-surveyor/types';

export interface AnalysisContext {
  type: 'building-damage' | 'general-image' | 'text-analysis' | 'job-analysis';
  jobId?: string;
  userId?: string;
  propertyType?: string;
  roomType?: string;
  urgency?: 'low' | 'medium' | 'high';
  requiresDecision?: boolean;
}

export interface AnalysisResult<T = any> {
  success: boolean;
  data?: T;
  error?: AIServiceError;
  fallbackUsed: boolean;
  cost?: number;
  service: string;
  model?: string;
  processingTime?: number;
}

export interface AIServiceError {
  code: 'BUDGET_EXCEEDED' | 'RATE_LIMITED' | 'INVALID_INPUT' | 'API_ERROR' | 'EMERGENCY_STOP';
  message: string;
  details?: unknown;
}

export interface GeneralImageAnalysis {
  labels: Array<{ name: string; confidence: number }>;
  objects: Array<{ name: string; confidence: number; boundingBox?: unknown }>;
  text: string[];
  safeSearch: {
    adult: string;
    violence: string;
  };
  dominantColors: Array<{ color: string; percentage: number }>;
  quality: {
    score: number;
    issues: string[];
  };
}

export interface JobAnalysis {
  category: string;
  urgency: 'low' | 'medium' | 'high';
  estimatedDuration: number; // hours
  requiredSkills: string[];
  suggestedPrice: {
    min: number;
    max: number;
    currency: string;
  };
  complexity: 'simple' | 'moderate' | 'complex';
  safetyConsiderations: string[];
  materialsNeeded: string[];
}

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
      // Check emergency stop first
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

      // Validate images
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

      // Route to appropriate service based on context
      switch (context.type) {
        case 'building-damage':
          return await this.analyzeBuildingDamage(images, context, startTime);

        case 'general-image':
          return await this.analyzeGeneralImage(images, context, startTime);

        case 'job-analysis':
          return await this.analyzeJob(images, context, startTime);

        default:
          return await this.analyzeGeneralImage(images, context, startTime);
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
   * Analyze building damage using Building Surveyor Service
   */
  private static async analyzeBuildingDamage(
    images: string[],
    context: AnalysisContext,
    startTime: number
  ): Promise<AnalysisResult<Phase1BuildingAssessment>> {
    try {
      // Use Building Surveyor for sophisticated damage analysis
      const assessment = await BuildingSurveyorService.assessDamage(images, {
        jobId: context.jobId,
        propertyType: context.propertyType || 'residential',
        roomType: context.roomType,
        urgencyOverride: context.urgency,
      });

      // Get cost from the assessment if available
      const cost = assessment.metadata?.apiCost || 0;

      return {
        success: true,
        data: assessment,
        fallbackUsed: false,
        cost,
        service: 'building-surveyor',
        model: 'gpt-4o',
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Building assessment failed';

      // Check if it's a budget error
      if (errorMessage.includes('Budget exceeded')) {
        return {
          success: false,
          error: {
            code: 'BUDGET_EXCEEDED',
            message: errorMessage,
          },
          fallbackUsed: false,
          service: 'building-surveyor',
          processingTime: Date.now() - startTime,
        };
      }

      // Log and return error
      logger.error('Building damage analysis failed', error);

      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: errorMessage,
          details: error,
        },
        fallbackUsed: false,
        service: 'building-surveyor',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Analyze general images using Image Analysis Service
   */
  private static async analyzeGeneralImage(
    images: string[],
    context: AnalysisContext,
    startTime: number
  ): Promise<AnalysisResult<GeneralImageAnalysis>> {
    try {
      // For general images, use the simpler ImageAnalysisService
      const analysisPromises = images.map(image =>
        ImageAnalysisService.analyzeImage(image)
      );

      const results = await Promise.all(analysisPromises);

      // Aggregate results from multiple images
      const aggregated: GeneralImageAnalysis = {
        labels: [],
        objects: [],
        text: [],
        safeSearch: {
          adult: 'VERY_UNLIKELY',
          violence: 'VERY_UNLIKELY',
        },
        dominantColors: [],
        quality: {
          score: 0,
          issues: [],
        },
      };

      // Combine results from all images
      for (const result of results) {
        if (result) {
          aggregated.labels.push(...(result.labels || []));
          aggregated.objects.push(...(result.objects || []));
          aggregated.text.push(...(result.text || []));
          // Take the highest risk level for safe search
          if (result.safeSearch) {
            if (this.compareSafeSearchLevel(result.safeSearch.adult, aggregated.safeSearch.adult) > 0) {
              aggregated.safeSearch.adult = result.safeSearch.adult;
            }
            if (this.compareSafeSearchLevel(result.safeSearch.violence, aggregated.safeSearch.violence) > 0) {
              aggregated.safeSearch.violence = result.safeSearch.violence;
            }
          }
        }
      }

      // Deduplicate and sort by confidence
      aggregated.labels = this.deduplicateAndSort(aggregated.labels);
      aggregated.objects = this.deduplicateAndSort(aggregated.objects);
      aggregated.text = [...new Set(aggregated.text)];

      return {
        success: true,
        data: aggregated,
        fallbackUsed: false,
        cost: images.length * 0.0015, // Approximate Google Vision cost
        service: 'image-analysis',
        model: 'google-vision',
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('General image analysis failed', error);

      // Return fallback analysis
      return {
        success: true,
        data: this.generateFallbackImageAnalysis(),
        fallbackUsed: true,
        cost: 0,
        service: 'fallback',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Analyze job from images and description
   */
  private static async analyzeJob(
    images: string[],
    context: AnalysisContext,
    startTime: number
  ): Promise<AnalysisResult<JobAnalysis>> {
    try {
      // Check budget first
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

      // Use GPT-4 Vision for job analysis
      const response = await this.callGPT4Vision(
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

      // Fallback to rule-based analysis
      return {
        success: true,
        data: this.generateFallbackJobAnalysis(),
        fallbackUsed: true,
        cost: 0,
        service: 'fallback',
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Job analysis failed', error);

      return {
        success: true,
        data: this.generateFallbackJobAnalysis(),
        fallbackUsed: true,
        cost: 0,
        service: 'fallback',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Call GPT-4 Vision API directly for custom analysis
   */
  private static async callGPT4Vision(
    images: string[],
    prompt: string,
    service: string
  ): Promise<{ success: boolean; data?: unknown; cost?: number }> {
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const messages = [
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: prompt },
            ...images.map(url => ({
              type: 'image_url' as const,
              image_url: { url, detail: 'auto' as const },
            })),
          ],
        },
      ];

      const response = await fetchWithOpenAIRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages,
            max_tokens: 1000,
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        },
        {
          maxAttempts: 3,
          baseDelayMs: 1000,
        }
      );

      const data = await response.json();
      const usage = data.usage;
      const content = data.choices[0]?.message?.content;

      // Calculate and record cost
      let cost = 0;
      if (usage) {
        cost = CostControlService.estimateCost('gpt-4o', {
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
        });

        await CostControlService.recordUsage(service, 'gpt-4o', cost, {
          tokens: usage.total_tokens,
          success: true,
        });
      }

      // Parse response
      const parsedContent = JSON.parse(content || '{}');

      return {
        success: true,
        data: parsedContent,
        cost,
      };
    } catch (error) {
      logger.error('GPT-4 Vision call failed', error);
      return {
        success: false,
      };
    }
  }

  /**
   * Generate fallback image analysis when AI services fail
   */
  private static generateFallbackImageAnalysis(): GeneralImageAnalysis {
    return {
      labels: [
        { name: 'image', confidence: 1.0 },
        { name: 'photo', confidence: 0.9 },
      ],
      objects: [],
      text: [],
      safeSearch: {
        adult: 'VERY_UNLIKELY',
        violence: 'VERY_UNLIKELY',
      },
      dominantColors: [],
      quality: {
        score: 0.5,
        issues: ['Analysis unavailable'],
      },
    };
  }

  /**
   * Generate fallback job analysis when AI services fail
   */
  private static generateFallbackJobAnalysis(): JobAnalysis {
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

  /**
   * Compare Google Vision safe search levels
   */
  private static compareSafeSearchLevel(level1: string, level2: string): number {
    const levels = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
    return levels.indexOf(level1) - levels.indexOf(level2);
  }

  /**
   * Deduplicate and sort by confidence
   */
  private static deduplicateAndSort<T extends { name: string; confidence: number }>(
    items: T[]
  ): T[] {
    const map = new Map<string, T>();

    for (const item of items) {
      const existing = map.get(item.name);
      if (!existing || item.confidence > existing.confidence) {
        map.set(item.name, item);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
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
        'fallback': true, // Always available
      },
    };
  }
}
import { Job } from '@mintenance/types';
import { AIAnalysis } from './AIAnalysisService';
import { logger } from '../utils/logger';
import { isAIConfigured, getConfiguredAIService, aiConfig } from '../config/ai.config';
import { analyzeWithOpenAI } from './providers/openai-provider';
import { generateIntelligentFallback } from './providers/fallback-analysis';

/**
 * Production-ready AI Analysis Service
 * Integrates with real AI services (OpenAI GPT-4 Vision).
 * Falls back to enhanced rule-based analysis if API key not available.
 *
 * Delegates to focused modules under providers/:
 * - openai-provider: OpenAI Vision API calls, retry, validation, text parsing
 * - fallback-analysis: rule-based category analysis and equipment detection
 * - text-extraction: regex utilities for parsing unstructured AI text
 * - ai-analysis-types: shared type definitions
 */
export class RealAIAnalysisService {
  /**
   * Validate API key to prevent crashes from empty strings, null, or placeholder values.
   */
  private static validateAPIKey(key: string | undefined | null, serviceName: string): string | null {
    if (!key || typeof key !== 'string') {
      logger.warn('RealAIAnalysisService', `${serviceName} API key not configured`);
      return null;
    }

    const trimmedKey = key.trim();

    if (trimmedKey.length === 0) {
      logger.warn('RealAIAnalysisService', `${serviceName} API key is empty string`);
      return null;
    }

    if (trimmedKey.length < 20) {
      logger.warn('RealAIAnalysisService', `${serviceName} API key format appears invalid (too short)`);
      return null;
    }

    const lowerKey = trimmedKey.toLowerCase();
    if (
      lowerKey === 'undefined' ||
      lowerKey === 'null' ||
      lowerKey.startsWith('your-') ||
      lowerKey.startsWith('your_') ||
      lowerKey.includes('example') ||
      lowerKey.includes('placeholder')
    ) {
      logger.warn('RealAIAnalysisService', `${serviceName} API key is placeholder value`);
      return null;
    }

    return trimmedKey;
  }

  private static get OPENAI_API_KEY() {
    return this.validateAPIKey(aiConfig.openai.apiKey, 'OpenAI');
  }

  /**
   * Analyze job photos using real AI service.
   */
  static async analyzeJobPhotos(job: Job): Promise<AIAnalysis | null> {
    try {
      logger.info('RealAIAnalysisService', 'Starting job analysis', {
        jobId: job.id,
        category: job.category,
        hasPhotos: !!(job.photos && job.photos.length > 0),
        photoCount: job.photos?.length || 0,
        configuredService: getConfiguredAIService(),
        aiConfigured: isAIConfigured(),
      });

      // Try OpenAI GPT-4 Vision if available
      if (this.OPENAI_API_KEY && job.photos && job.photos.length > 0) {
        logger.info('RealAIAnalysisService', 'Using OpenAI GPT-4 Vision analysis');
        return await analyzeWithOpenAI(job, this.OPENAI_API_KEY);
      }

      // Fallback: Enhanced rule-based analysis
      logger.info('RealAIAnalysisService', 'No AI service configured, using intelligent fallback');
      return generateIntelligentFallback(job);
    } catch (error) {
      logger.error('RealAIAnalysisService', error instanceof Error ? error : new Error('AI analysis failed, using fallback'));
      return generateIntelligentFallback(job);
    }
  }

  /**
   * Check if any AI service is configured.
   */
  static isAIServiceConfigured(): boolean {
    return !!this.OPENAI_API_KEY;
  }

  /**
   * Get configured AI service name for logging/display.
   */
  static getConfiguredService(): string {
    if (this.OPENAI_API_KEY) return 'OpenAI GPT-4 Vision';
    return 'Enhanced Rule-based Analysis';
  }
}

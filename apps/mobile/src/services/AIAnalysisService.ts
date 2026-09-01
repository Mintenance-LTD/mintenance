import { Job } from '@mintenance/types';
import { aiAnalyzeRequestSchema } from '@mintenance/api-contracts';
import { logger } from '../utils/logger';
import { mobileApiClient } from '../utils/mobileApiClient';

export interface AIAnalysis {
  confidence: number;
  detectedItems: string[];
  safetyConcerns: {
    concern: string;
    severity: 'Low' | 'Medium' | 'High';
    description: string;
  }[];
  recommendedActions: string[];
  estimatedComplexity: 'Low' | 'Medium' | 'High';
  suggestedTools: string[];
  estimatedDuration: string;
  detectedEquipment?: { name: string; confidence: number; location: string }[];
}

interface AnalyzeResponse {
  success: boolean;
  data?: AIAnalysis;
  error?: string;
  message?: string;
}

export class AIAnalysisService {
  /** Request the server-backed Mint AI analysis; never synthesize a result. */
  static async analyzeJobPhotos(job: Job): Promise<AIAnalysis | null> {
    const photos = job.photos?.filter(
      (photo): photo is string => typeof photo === 'string' && photo.length > 0
    );

    if (!photos || photos.length === 0) return null;

    try {
      const request = aiAnalyzeRequestSchema.parse({
        images: photos,
        context: {
          type: 'job-analysis',
          jobId: job.id,
          category: job.category,
          description: job.description,
        },
      });
      const response = await mobileApiClient.post<AnalyzeResponse>(
        '/api/ai/analyze',
        request
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message || response.error || 'AI analysis failed'
        );
      }

      return response.data;
    } catch (error) {
      logger.error('Mint AI analysis request failed', error);
      throw error instanceof Error ? error : new Error('AI analysis failed');
    }
  }
}

import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { GPT4CacheService } from '../../ai/GPT4CacheService';
import { PromptBuilder } from './PromptBuilder';
import type {
  AssessmentContext,
  RoboflowDetection,
  VisionAnalysisSummary,
} from '../types';

/**
 * GPT-4 Vision call + cache layer extracted from AssessmentOrchestrator
 * on 2026-05-09. Returns either a cached response or a fresh GPT call
 * result, plus the duration so the orchestrator can record metrics.
 */

export interface GptVisionResult {
  aiAssessment: Record<string, unknown>;
  cached: boolean;
  durationMs: number;
  tokensUsed: number;
}

const gptResponseSchema = z
  .object({
    damageType: z.string().optional(),
    severity: z.string().optional(),
    confidence: z.number().min(0).max(100).optional(),
    riskScore: z.number().min(0).max(100).optional(),
    damageAssessment: z.record(z.unknown()).optional(),
  })
  .passthrough();

export async function runGptVision(
  imageUrls: string[],
  context: AssessmentContext | undefined,
  roboflowDetections: RoboflowDetection[],
  visionAnalysis: VisionAnalysisSummary | null,
  openaiApiKey: string
): Promise<GptVisionResult> {
  const cachedResponse = await GPT4CacheService.getCached(imageUrls, context);

  if (cachedResponse) {
    logger.info('Using cached GPT-4 response', {
      service: 'AssessmentOrchestrator',
      savedCost: cachedResponse.savedCost,
      hitCount: cachedResponse.hitCount,
    });
    return {
      aiAssessment: cachedResponse.assessment as unknown as Record<
        string,
        unknown
      >,
      cached: true,
      durationMs: 0,
      tokensUsed: 0,
    };
  }

  const messages = PromptBuilder.buildMessages(
    imageUrls,
    context,
    roboflowDetections,
    visionAnalysis
  );

  const gptStart = Date.now();
  const { fetchWithOpenAIRetry } =
    await import('@/lib/utils/openai-rate-limit');

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
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    },
    {
      maxAttempts: 5,
      baseDelayMs: 2000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
    }
  );

  const data = await response.json();
  const durationMs = Date.now() - gptStart;
  const aiContent = data.choices?.[0]?.message?.content;
  if (!aiContent) {
    throw new Error('No content in GPT-4 Vision response');
  }

  // SECURITY: validate the GPT response structure rather than trusting
  // raw JSON from the model. Falls back to the raw parse on schema
  // mismatch so we never hard-fail an otherwise-useful response.
  const rawParsed = JSON.parse(aiContent);
  const validated = gptResponseSchema.safeParse(rawParsed);
  if (!validated.success) {
    logger.warn('GPT response failed schema validation — using raw parse', {
      service: 'assessment-orchestrator',
      errors: validated.error.issues.slice(0, 3),
    });
  }
  const aiAssessment = (
    validated.success ? validated.data : rawParsed
  ) as Record<string, unknown>;

  return {
    aiAssessment,
    cached: false,
    durationMs,
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

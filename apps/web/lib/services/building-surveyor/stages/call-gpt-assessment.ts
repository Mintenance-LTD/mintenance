import { logger } from '@mintenance/shared';
import { CostControlService } from '../../ai/CostControlService';
import { getGeneratorContent } from '../generator/AssessmentGenerator';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';
import { AI_ASSESSMENT_SCHEMA, type AiAssessmentPayload } from '../validation-schemas';
import { buildSystemPrompt, buildUserPrompt } from '../prompt-builder';
import { buildEvidenceSummary } from '../evidence-processor';
import type {
  AssessmentContext,
  RoboflowDetection,
  VisionAnalysisSummary,
} from '../types';

const AGENT_NAME = 'building-surveyor';

function recordMetric(metric: string, payload: Record<string, unknown>): void {
  MonitoringService.record(metric, { agentName: AGENT_NAME, ...payload });
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' | 'auto' } }
      >;
}

/**
 * Builds prompts, checks budget, calls GPT-4o (or Mint AI VLM),
 * parses and validates the JSON response.
 */
export async function callGptAssessment(
  validatedImageUrls: string[],
  openaiApiKey: string,
  roboflowDetections: RoboflowDetection[],
  visionAnalysis: VisionAnalysisSummary | null,
  hasMachineEvidence: boolean,
  context?: AssessmentContext,
  damageTypesForPrompt?: string[],
): Promise<AiAssessmentPayload> {
  // Limit to 4 images (GPT-4 Vision limit)
  const imagesToAnalyze = validatedImageUrls.slice(0, 4);

  // Build prompts
  const systemPrompt = buildSystemPrompt(damageTypesForPrompt);
  const evidenceSummary = buildEvidenceSummary(roboflowDetections, visionAnalysis);
  const hasDetectionEvidence = roboflowDetections.length > 0 || !!visionAnalysis;
  const userPrompt = buildUserPrompt(context, evidenceSummary, hasDetectionEvidence);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },
        ...imagesToAnalyze.map((url) => ({
          type: 'image_url' as const,
          image_url: { url, detail: 'high' as const },
        })),
      ],
    },
  ];

  // Emergency stop check
  if (CostControlService.isEmergencyStopped()) {
    throw new Error('AI services are currently disabled due to emergency stop');
  }

  // Budget check
  const estimatedTokens = 1500 + imagesToAnalyze.length * 500;
  const estimatedCost = CostControlService.estimateCost('gpt-4o', {
    inputTokens: estimatedTokens,
    outputTokens: 2000,
    images: imagesToAnalyze.length,
  });

  const budgetCheck = await CostControlService.checkBudget({
    service: 'building-surveyor',
    model: 'gpt-4o',
    estimatedCost,
  });

  if (!budgetCheck.allowed) {
    logger.error('Building Surveyor request blocked due to budget constraints', {
      reason: budgetCheck.reason,
      dailyRemaining: budgetCheck.dailyBudgetRemaining,
    });
    throw new Error(`Budget exceeded: ${budgetCheck.reason}`);
  }

  logger.info('Building Surveyor budget check passed', {
    estimatedCost,
    dailyRemaining: budgetCheck.dailyBudgetRemaining,
  });

  // Call generator
  const gptStart = Date.now();
  const genResult = await getGeneratorContent(messages, openaiApiKey);
  const gptDuration = Date.now() - gptStart;

  // Record usage
  const usage = genResult.usage;
  if (usage) {
    const actualCost = CostControlService.estimateCost(genResult.model, {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
    });

    await CostControlService.recordUsage('building-surveyor', genResult.model, actualCost, {
      tokens: usage.total_tokens,
      job_id: context?.jobId,
      success: true,
    });

    logger.info('Building Surveyor API usage recorded', {
      model: genResult.model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cost: actualCost,
    });
  }

  recordMetric('gpt.assessment', {
    durationMs: gptDuration,
    imageCount: imagesToAnalyze.length,
    hasMachineEvidence,
    generator: genResult.model,
  });

  // Parse JSON
  let aiResponseRaw: unknown;
  try {
    aiResponseRaw = JSON.parse(genResult.content);
  } catch (parseError) {
    logger.error('Failed to parse OpenAI response', {
      service: 'BuildingSurveyorService',
      content: genResult.content.substring(0, 500),
    });
    throw new Error('Failed to parse AI assessment response');
  }

  // Validate schema
  try {
    return AI_ASSESSMENT_SCHEMA.parse(aiResponseRaw);
  } catch (validationError) {
    logger.error('AI assessment response failed validation', validationError, {
      service: 'BuildingSurveyorService',
    });
    throw new Error('AI assessment response failed validation');
  }
}

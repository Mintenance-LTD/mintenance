import { logger } from '@mintenance/shared';
import { CostControlService } from '../../ai/CostControlService';
import { getGeneratorContent } from '../generator/AssessmentGenerator';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { AI_ASSESSMENT_SCHEMA, type AiAssessmentPayload } from '../validation-schemas';
import { buildSystemPrompt, buildUserPrompt } from '../prompt-builder';
import { buildEvidenceSummary } from '../evidence-processor';
import type {
  AssessmentContext,
  RoboflowDetection,
  VisionAnalysisSummary,
} from '../types';

const AGENT_NAME = 'building-surveyor';

/** Use the same configurable model as the generator */
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-4o';

// P1: Circuit breaker for GPT-4o API
const gptCircuitBreaker = new CircuitBreaker({
  name: 'GPT4o-Assessment',
  failureThreshold: 3,
  resetTimeoutMs: 300_000, // 5 minutes
});

/** Maximum time (ms) for the entire GPT assessment call including retries (Issue 38) */
const GPT_ASSESSMENT_TIMEOUT_MS = 150_000; // 2.5 min — gpt-4o vision with multiple images can take >90s

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
  // Build prompts
  const systemPrompt = buildSystemPrompt(damageTypesForPrompt);
  const evidenceSummary = buildEvidenceSummary(roboflowDetections, visionAnalysis);
  const hasDetectionEvidence = roboflowDetections.length > 0 || !!visionAnalysis;
  const userPrompt = buildUserPrompt(context, evidenceSummary, hasDetectionEvidence);

  // Before/after comparison mode: when before photos are present, interleave them with
  // the after (current) photos so the model can reason about change over time.
  // Keep total images ≤ 4 (GPT-4 Vision practical limit).
  const beforeUrls = (context?.beforeImageUrls ?? []).filter(Boolean);
  let userContent: ChatMessage['content'];
  let imageCount: number;

  if (beforeUrls.length > 0) {
    const beforeToShow = beforeUrls.slice(0, 2);
    const afterToShow = validatedImageUrls.slice(0, 4 - beforeToShow.length);
    imageCount = beforeToShow.length + afterToShow.length;
    userContent = [
      {
        type: 'text',
        text: `You are comparing BEFORE and AFTER photos of the same building area.\nBEFORE images show the pre-existing/damaged state.\nAFTER images show the current state for assessment.\n\n${userPrompt}`,
      },
      { type: 'text', text: '[BEFORE photos — pre-existing state:]' },
      ...beforeToShow.map((url) => ({
        type: 'image_url' as const,
        image_url: { url, detail: 'auto' as const },
      })),
      { type: 'text', text: '[AFTER photos — current state for assessment:]' },
      ...afterToShow.map((url) => ({
        type: 'image_url' as const,
        image_url: { url, detail: 'auto' as const },
      })),
    ];
  } else {
    // Standard mode: single set of current photos (up to 4)
    const imagesToAnalyze = validatedImageUrls.slice(0, 4);
    imageCount = imagesToAnalyze.length;
    userContent = [
      { type: 'text', text: userPrompt },
      ...imagesToAnalyze.map((url) => ({
        type: 'image_url' as const,
        image_url: { url, detail: 'auto' as const },
      })),
    ];
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  // Emergency stop check
  if (await CostControlService.isEmergencyStopped()) {
    throw new Error('AI services are currently disabled due to emergency stop');
  }

  // P1: Circuit breaker check
  if (gptCircuitBreaker.isOpen()) {
    throw new Error('GPT-4o circuit breaker is open — too many recent failures');
  }

  // Budget check
  const estimatedTokens = 1500 + imageCount * 500;
  const estimatedCost = CostControlService.estimateCost(OPENAI_MODEL, {
    inputTokens: estimatedTokens,
    outputTokens: 2000,
    images: imageCount,
  });

  const budgetCheck = await CostControlService.checkBudget({
    service: 'building-surveyor',
    model: OPENAI_MODEL,
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

  // Call generator with timeout to prevent indefinite blocking (Issue 38)
  const gptStart = Date.now();
  let genResult;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI assessment timed out after 90 seconds')), GPT_ASSESSMENT_TIMEOUT_MS),
    );
    genResult = await Promise.race([
      getGeneratorContent(messages, openaiApiKey),
      timeoutPromise,
    ]);
    gptCircuitBreaker.recordSuccess();
  } catch (error) {
    gptCircuitBreaker.recordFailure();
    throw error;
  }
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
      job_id: (context as Record<string, unknown> | undefined)?.jobId as string | undefined,
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
    imageCount,
    hasMachineEvidence,
    generator: genResult.model,
    beforeAfterMode: beforeUrls.length > 0,
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

/**
 * Assessment generator: GPT-4o or Mint AI in-house VLM, routed by VLM_ROUTING_MODE.
 * Defaults to shadow_only; direct student serving is safety-gated and always
 * falls back to GPT-4o. USE_MINT_AI_VLM without an endpoint uses the GPT stub.
 */

import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { fetchWithOpenAIRetry } from '@/lib/utils/openai-rate-limit';
import { BuildingPathologyRAGService } from '../BuildingPathologyRAGService';
import {
  MINT_AI_MODEL_ID,
  MINT_AI_SERVED_MODEL,
} from '../../ai/mint-ai-constants';
import { validateVlmEndpoint } from './validate-vlm-endpoint';

const USE_MINT_AI_VLM = process.env.USE_MINT_AI_VLM === 'true';
const MINT_AI_VLM_API_KEY = process.env.MINT_AI_VLM_API_KEY?.trim() || '';

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-4o';

const MINT_AI_VLM_ENDPOINT = validateVlmEndpoint(
  process.env.MINT_AI_VLM_ENDPOINT?.trim() || ''
);

export interface GeneratorMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | {
            type: 'image_url';
            image_url: { url: string; detail: 'high' | 'low' | 'auto' };
          }
      >;
}

export interface GeneratorResult {
  content: string;
  model: string;
  provider: 'openai' | 'mint-ai';
  routingMode: 'teacher_only' | 'shadow_only' | 'auto' | 'student_only';
  fallbackReason?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** GPT reasoning extracted for distillation. */
  reasoning?: string | null;
}

/** Call the configured OpenAI vision model and return content plus usage. */
async function callGPT4o(
  messages: GeneratorMessage[],
  apiKey: string
): Promise<GeneratorResult> {
  const response = await fetchWithOpenAIRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
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

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  const rawContent = data.choices?.[0]?.message?.content ?? '{}';

  // Keep reasoning for distillation, but remove it from the assessment payload.
  let content = rawContent;
  let reasoning: string | null = null;
  try {
    const rawParsed = JSON.parse(rawContent);
    // Validate critical fields from GPT response
    const gptSchema = z
      .object({
        damageType: z.string().optional(),
        severity: z.string().optional(),
        confidence: z.number().min(0).max(100).optional(),
        reasoning: z.string().optional(),
      })
      .passthrough();
    const validated = gptSchema.safeParse(rawParsed);
    const parsed = (validated.success ? validated.data : rawParsed) as Record<
      string,
      unknown
    >;
    if (!validated.success) {
      logger.warn('GPT assessment response failed schema validation', {
        service: 'assessment-generator',
        errors: validated.error.issues.slice(0, 3),
      });
    }
    if (typeof parsed.reasoning === 'string' && parsed.reasoning.length > 0) {
      reasoning = parsed.reasoning;
      delete parsed.reasoning;
      content = JSON.stringify(parsed);
    }
  } catch {
    // Non-fatal: if JSON parse fails, pass raw content through unchanged
  }

  return {
    content,
    model: OPENAI_MODEL,
    provider: 'openai',
    routingMode: getRoutingMode(),
    usage: data.usage,
    reasoning,
  };
}

function getRoutingMode(): GeneratorResult['routingMode'] {
  const mode = process.env.VLM_ROUTING_MODE?.trim();
  return mode === 'teacher_only' || mode === 'auto' || mode === 'student_only'
    ? mode
    : 'shadow_only';
}

async function teacherFallback(
  messages: GeneratorMessage[],
  apiKey: string,
  reason: string
): Promise<GeneratorResult> {
  const result = await callGPT4o(messages, apiKey);
  return { ...result, fallbackReason: reason };
}

/**
 * Call in-house Mint AI VLM at MINT_AI_VLM_ENDPOINT (OpenAI-compatible chat completions).
 * Uses MINT_AI_VLM_API_KEY if set, else apiKey (e.g. gateway).
 */
export async function callMintAiVLM(
  messages: GeneratorMessage[],
  apiKey: string
): Promise<GeneratorResult> {
  const endpoint = MINT_AI_VLM_ENDPOINT;
  const token = MINT_AI_VLM_API_KEY || apiKey;

  const response = await fetchWithOpenAIRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MINT_AI_SERVED_MODEL,
        messages,
        max_tokens: 1500,
        temperature: 0.2,
        // frequency_penalty=0.5 prevents the repetition loop observed in v1
        // diagnostic testing, where the model emitted the same detection 30+
        // times filling max_tokens. Confirmed safe via smoke tests on v2.
        frequency_penalty: 0.5,
        response_format: { type: 'json_object' },
      }),
    },
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    }
  );

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  return {
    content,
    model: MINT_AI_MODEL_ID,
    provider: 'mint-ai',
    routingMode: getRoutingMode(),
    usage: data.usage,
  };
}

/**
 * Mint AI VLM stub when USE_MINT_AI_VLM=true but no endpoint: delegates to GPT-4o.
 */
async function mintAiStub(
  messages: GeneratorMessage[],
  apiKey: string
): Promise<GeneratorResult> {
  const result = await callGPT4o(messages, apiKey);
  // Keep the real model name: this label flows into cost tracking and
  // building_assessments analytics, and stamping 'mint-ai-vlm' here made
  // GPT-4o output indistinguishable from genuine student output downstream.
  logger.info('Mint AI VLM stub active — request served by GPT-4o', {
    service: 'AssessmentGenerator',
    servedBy: result.model,
  });
  return result;
}

/**
 * Inject RAG knowledge base context into the system message if available.
 * Adds RICS/BRE-sourced defect knowledge to ground the AI in authoritative standards.
 */
async function injectRAGContext(
  messages: GeneratorMessage[],
  damageCategory?: string,
  propertyAge?: number
): Promise<GeneratorMessage[]> {
  try {
    let ragContext;

    if (damageCategory) {
      // Try semantic search first — higher recall for damage types not in the
      // exact slug mapping, or where the category label is imprecise.
      ragContext = await BuildingPathologyRAGService.queryBySemantic(
        damageCategory.replace(/_/g, ' '), // "wall_crack" → "wall crack"
        { matchCount: 4, matchThreshold: 0.5 }
      );
      // Fall back to category filter if embeddings not yet seeded
      if (!ragContext.entries.length) {
        const categories =
          BuildingPathologyRAGService.damageTypeToCategories(damageCategory);
        ragContext =
          categories.length > 0
            ? await BuildingPathologyRAGService.queryByCategory(
                categories,
                4,
                propertyAge
              )
            : await BuildingPathologyRAGService.queryByCategory(
                [
                  'damp_moisture',
                  'structural_movement',
                  'roofing',
                  'masonry_walls',
                ],
                3,
                propertyAge
              );
      }
    } else {
      ragContext = await BuildingPathologyRAGService.queryByCategory(
        ['damp_moisture', 'structural_movement', 'roofing', 'masonry_walls'],
        3,
        propertyAge
      );
    }

    if (!ragContext.promptContext) return messages;

    // Append RAG context to the system message
    return messages.map((msg) => {
      if (msg.role !== 'system') return msg;
      const existingContent =
        typeof msg.content === 'string' ? msg.content : '';
      return {
        ...msg,
        content: `${existingContent}\n\n${ragContext.promptContext}`,
      };
    });
  } catch {
    // RAG failure is non-fatal — return original messages unchanged
    return messages;
  }
}

export async function getGeneratorContent(
  messages: GeneratorMessage[],
  apiKey: string,
  context?: {
    assessmentId?: string;
    damageCategory?: string;
    propertyType?: string;
    propertyAge?: number;
  }
): Promise<GeneratorResult> {
  // Inject RAG knowledge base context before any AI call (with property age for era-filtered results)
  const enrichedMessages = await injectRAGContext(
    messages,
    context?.damageCategory,
    context?.propertyAge
  );

  // Phase 4: Confidence-based student routing (only when VLM_ROUTING_MODE=auto)
  if (
    MINT_AI_VLM_ENDPOINT &&
    process.env.VLM_ROUTING_MODE === 'auto' &&
    context?.damageCategory
  ) {
    try {
      const { StudentRoutingGate } =
        await import('../distillation/StudentRoutingGate');
      const routingContext = context.propertyType
        ? ({
            propertyType: context.propertyType,
          } as import('../types').AssessmentContext)
        : undefined;
      const decision = await StudentRoutingGate.shouldUseStudent(
        routingContext,
        context.damageCategory
      );

      if (decision.decision === 'student_only') {
        try {
          const studentResult = await callMintAiVLM(enrichedMessages, apiKey);

          // Phase 5: Safety recall gate — validate student output before serving
          try {
            const { SafetyRecallGate } =
              await import('../distillation/SafetyRecallGate');
            const parsed = JSON.parse(studentResult.content);
            if (
              parsed?.safetyHazards &&
              parsed?.damageAssessment &&
              parsed?.urgency
            ) {
              const safetyCheck = SafetyRecallGate.validateStudentSafety(
                parsed,
                context.damageCategory
              );
              if (!safetyCheck.safe) {
                logger.warn(
                  'Student VLM failed safety gate, falling back to GPT-4o',
                  {
                    service: 'AssessmentGenerator',
                    failReason: safetyCheck.failReason,
                    category: context.damageCategory,
                  }
                );
                await SafetyRecallGate.recordSafetyViolation(
                  context.assessmentId || 'unknown',
                  context.damageCategory,
                  safetyCheck.failReason || 'unknown',
                  parsed
                );
                return teacherFallback(
                  enrichedMessages,
                  apiKey,
                  `student_safety_gate:${safetyCheck.failReason || 'unsafe'}`
                );
              }
            } else {
              return teacherFallback(
                enrichedMessages,
                apiKey,
                'student_safety_gate:missing_required_fields'
              );
            }
          } catch (error) {
            logger.warn(
              'Student safety validation failed, falling back to GPT-4o',
              {
                service: 'AssessmentGenerator',
                error: error instanceof Error ? error.message : String(error),
              }
            );
            return teacherFallback(
              enrichedMessages,
              apiKey,
              'student_safety_gate:validation_error'
            );
          }

          return studentResult;
        } catch (err) {
          logger.warn('Student VLM failed, falling back to GPT-4o', {
            service: 'AssessmentGenerator',
            error: err instanceof Error ? err.message : String(err),
          });
          return teacherFallback(
            enrichedMessages,
            apiKey,
            'student_request_failed'
          );
        }
      }
      // teacher_only or shadow_compare -> fall through to existing logic
    } catch {
      // Routing gate failure is non-fatal, fall through
    }
  }

  // Serving the student directly to users is an explicit opt-in
  // (VLM_ROUTING_MODE=student_only). In shadow_only (default) and
  // teacher_only the teacher serves every request; the student still runs
  // fire-and-forget via StudentShadowService when the endpoint is set.
  // Without this guard, merely configuring MINT_AI_VLM_ENDPOINT flipped
  // production onto the student regardless of routing mode.
  const routingMode = process.env.VLM_ROUTING_MODE?.trim() || 'shadow_only';
  if (MINT_AI_VLM_ENDPOINT && routingMode === 'student_only') {
    try {
      const studentResult = await callMintAiVLM(enrichedMessages, apiKey);
      try {
        const { SafetyRecallGate } =
          await import('../distillation/SafetyRecallGate');
        const parsed = JSON.parse(studentResult.content);
        if (
          !parsed?.safetyHazards ||
          !parsed?.damageAssessment ||
          !parsed?.urgency
        ) {
          return teacherFallback(
            enrichedMessages,
            apiKey,
            'student_safety_gate:missing_required_fields'
          );
        }
        const category = String(
          parsed.damageAssessment.damageType || 'unknown'
        );
        const safetyCheck = SafetyRecallGate.validateStudentSafety(
          parsed,
          category
        );
        if (!safetyCheck.safe) {
          await SafetyRecallGate.recordSafetyViolation(
            context?.assessmentId || 'unknown',
            category,
            safetyCheck.failReason || 'unknown',
            parsed
          );
          return teacherFallback(
            enrichedMessages,
            apiKey,
            `student_safety_gate:${safetyCheck.failReason || 'unsafe'}`
          );
        }
      } catch (error) {
        logger.warn(
          'Student safety validation failed, falling back to GPT-4o',
          {
            service: 'AssessmentGenerator',
            error: error instanceof Error ? error.message : String(error),
          }
        );
        return teacherFallback(
          enrichedMessages,
          apiKey,
          'student_safety_gate:validation_error'
        );
      }
      return studentResult;
    } catch (err) {
      logger.warn('Mint AI VLM endpoint failed, falling back to GPT-4o', {
        service: 'AssessmentGenerator',
        error: err instanceof Error ? err.message : String(err),
      });
      return teacherFallback(
        enrichedMessages,
        apiKey,
        'student_request_failed'
      );
    }
  }
  if (USE_MINT_AI_VLM && !MINT_AI_VLM_ENDPOINT) {
    return mintAiStub(enrichedMessages, apiKey);
  }
  return callGPT4o(enrichedMessages, apiKey);
}

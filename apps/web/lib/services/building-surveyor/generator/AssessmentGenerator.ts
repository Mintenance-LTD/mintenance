/**
 * Assessment generator: GPT-4o or Mint AI in-house VLM (feature-flagged / endpoint).
 * Phase 4: MINT_AI_VLM_ENDPOINT set -> in-house VLM; USE_MINT_AI_VLM=true -> stub (GPT-4o); else -> GPT-4o.
 */

import { logger } from '@mintenance/shared';
import { fetchWithOpenAIRetry } from '@/lib/utils/openai-rate-limit';
import { BuildingPathologyRAGService } from '../BuildingPathologyRAGService';

export const USE_MINT_AI_VLM = process.env.USE_MINT_AI_VLM === 'true';
const MINT_AI_VLM_API_KEY = process.env.MINT_AI_VLM_API_KEY?.trim() || '';

/** Configurable OpenAI model — set OPENAI_MODEL env var to use a different model (e.g. gpt-4.1, gpt-4o-mini) */
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-4o';

/** Block SSRF: only allow HTTPS URLs to non-internal hosts */
function validateVlmEndpoint(raw: string): string {
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      logger.warn('MINT_AI_VLM_ENDPOINT must be HTTPS in production, ignoring', { service: 'AssessmentGenerator' });
      return '';
    }
    if (!['https:', 'http:'].includes(url.protocol)) {
      return '';
    }
    const h = url.hostname;
    // Block cloud metadata + reserved IPs (SSRF targets)
    if (h === '169.254.169.254' || h === 'metadata.google.internal' ||
        h.endsWith('.internal') || h === '[::1]') {
      logger.warn('MINT_AI_VLM_ENDPOINT points to reserved address, ignoring', { service: 'AssessmentGenerator' });
      return '';
    }
    return raw;
  } catch {
    logger.warn('MINT_AI_VLM_ENDPOINT is not a valid URL, ignoring', { service: 'AssessmentGenerator' });
    return '';
  }
}

const MINT_AI_VLM_ENDPOINT = validateVlmEndpoint(process.env.MINT_AI_VLM_ENDPOINT?.trim() || '');

export interface GeneratorMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' | 'auto' } }>;
}

export interface GeneratorResult {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Call OpenAI vision model and return raw content + usage.
 * Model configurable via OPENAI_MODEL env var (default: gpt-4o).
 */
async function callGPT4o(messages: GeneratorMessage[], apiKey: string): Promise<GeneratorResult> {
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
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  return {
    content,
    model: OPENAI_MODEL,
    usage: data.usage,
  };
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
        model: 'mint-ai-vlm',
        messages,
        max_tokens: 2000,
        temperature: 0.1,
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
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  return {
    content,
    model: 'mint-ai-vlm',
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
  logger.info('Mint AI VLM enabled (stub: using GPT-4o)', { service: 'AssessmentGenerator' });
  const result = await callGPT4o(messages, apiKey);
  return { ...result, model: 'mint-ai-vlm' };
}

/**
 * Inject RAG knowledge base context into the system message if available.
 * Adds RICS/BRE-sourced defect knowledge to ground the AI in authoritative standards.
 */
async function injectRAGContext(
  messages: GeneratorMessage[],
  damageCategory?: string
): Promise<GeneratorMessage[]> {
  try {
    const categories = damageCategory
      ? BuildingPathologyRAGService.damageTypeToCategories(damageCategory)
      : [];

    const ragContext = categories.length > 0
      ? await BuildingPathologyRAGService.queryByCategory(categories, 4)
      : await BuildingPathologyRAGService.queryByCategory(
          ['damp_moisture', 'structural_movement', 'roofing', 'masonry_walls'],
          3
        );

    if (!ragContext.promptContext) return messages;

    // Find the system message and append RAG context to it
    return messages.map(msg => {
      if (msg.role !== 'system') return msg;
      const existingContent = typeof msg.content === 'string' ? msg.content : '';
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
  context?: { assessmentId?: string; damageCategory?: string; propertyType?: string }
): Promise<GeneratorResult> {
  // Inject RAG knowledge base context before any AI call
  const enrichedMessages = await injectRAGContext(messages, context?.damageCategory);

  // Phase 4: Confidence-based student routing (only when VLM_ROUTING_MODE=auto)
  if (MINT_AI_VLM_ENDPOINT && process.env.VLM_ROUTING_MODE === 'auto' && context?.damageCategory) {
    try {
      const { StudentRoutingGate } = await import('../distillation/StudentRoutingGate');
      const routingContext = context.propertyType
        ? { propertyType: context.propertyType } as import('../types').AssessmentContext
        : undefined;
      const decision = await StudentRoutingGate.shouldUseStudent(
        routingContext,
        context.damageCategory
      );

      if (decision.decision === 'student_only') {
        try {
          return await callMintAiVLM(enrichedMessages, apiKey);
        } catch (err) {
          logger.warn('Student VLM failed, falling back to GPT-4o', {
            service: 'AssessmentGenerator',
            error: err instanceof Error ? err.message : String(err),
          });
          return callGPT4o(enrichedMessages, apiKey);
        }
      }
      // teacher_only or shadow_compare -> fall through to existing logic
    } catch {
      // Routing gate failure is non-fatal, fall through
    }
  }

  if (MINT_AI_VLM_ENDPOINT) {
    try {
      return await callMintAiVLM(enrichedMessages, apiKey);
    } catch (err) {
      logger.warn('Mint AI VLM endpoint failed, falling back to GPT-4o', {
        service: 'AssessmentGenerator',
        error: err instanceof Error ? err.message : String(err),
      });
      return callGPT4o(enrichedMessages, apiKey);
    }
  }
  if (USE_MINT_AI_VLM) {
    return mintAiStub(enrichedMessages, apiKey);
  }
  return callGPT4o(enrichedMessages, apiKey);
}

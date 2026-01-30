/**
 * OpenAI GPT-4 Vision provider for AI-powered job photo analysis.
 * Handles API requests, retry logic, response validation, and text fallback parsing.
 */

import { Job } from '@mintenance/types';
import { AIAnalysis } from '../AIAnalysisService';
import { logger } from '../../utils/logger';
import { aiConfig } from '../../config/ai.config';
import {
  OpenAIAnalysisResponse,
  OpenAISafetyConcern,
  OpenAIDetectedEquipment,
} from './ai-analysis-types';
import {
  extractNumberFromText,
  extractListFromText,
  extractSafetyConcerns,
  extractComplexity,
  extractDuration,
} from './text-extraction';
import { generateRealisticEquipment } from './fallback-analysis';

const MAX_RETRIES = 2;
const TIMEOUT_MS = 30000;
const BASE_DELAY_MS = 1000;

/**
 * Type guard: validates a safety concern object shape.
 */
function isValidSafetyConcern(obj: unknown): obj is OpenAISafetyConcern {
  if (!obj || typeof obj !== 'object') return false;
  const concern = obj as Record<string, unknown>;
  return (
    typeof concern.concern === 'string' &&
    typeof concern.severity === 'string' &&
    typeof concern.description === 'string'
  );
}

/**
 * Type guard: validates a detected equipment object shape.
 */
function isValidDetectedEquipment(obj: unknown): obj is OpenAIDetectedEquipment {
  if (!obj || typeof obj !== 'object') return false;
  const equipment = obj as Record<string, unknown>;
  return (
    typeof equipment.name === 'string' &&
    typeof equipment.confidence === 'number' &&
    typeof equipment.location === 'string'
  );
}

/**
 * Validate and format a parsed OpenAI JSON response into AIAnalysis.
 */
function validateAndFormatResponse(
  response: unknown,
  _job: Job
): AIAnalysis {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response format: expected object');
  }

  const parsed = response as Partial<OpenAIAnalysisResponse>;

  return {
    confidence: Math.min(
      Math.max(typeof parsed.confidence === 'number' ? parsed.confidence : 75, 0),
      100
    ),
    detectedItems: Array.isArray(parsed.detectedItems)
      ? parsed.detectedItems.filter((item): item is string => typeof item === 'string')
      : ['AI analysis completed'],
    safetyConcerns: Array.isArray(parsed.safetyConcerns)
      ? parsed.safetyConcerns
          .filter(isValidSafetyConcern)
          .map((c) => ({
            concern: c.concern,
            severity: ['Low', 'Medium', 'High'].includes(c.severity)
              ? (c.severity as 'Low' | 'Medium' | 'High')
              : 'Medium',
            description: c.description,
          }))
      : [
          {
            concern: 'Standard safety precautions',
            severity: 'Medium' as const,
            description:
              'Follow appropriate safety protocols for this type of work',
          },
        ],
    recommendedActions: Array.isArray(parsed.recommendedActions)
      ? parsed.recommendedActions.filter((item): item is string => typeof item === 'string')
      : [
          'Assess the situation thoroughly',
          'Gather necessary tools and materials',
          'Follow safety protocols',
        ],
    estimatedComplexity:
      parsed.estimatedComplexity &&
      ['Low', 'Medium', 'High'].includes(parsed.estimatedComplexity)
        ? parsed.estimatedComplexity
        : 'Medium',
    suggestedTools: Array.isArray(parsed.suggestedTools)
      ? parsed.suggestedTools.filter((item): item is string => typeof item === 'string')
      : ['Basic tools required'],
    estimatedDuration:
      typeof parsed.estimatedDuration === 'string'
        ? parsed.estimatedDuration
        : '2-4 hours',
    detectedEquipment: Array.isArray(parsed.detectedEquipment)
      ? parsed.detectedEquipment
          .filter(isValidDetectedEquipment)
          .map((e) => ({
            name: e.name,
            confidence: Math.min(Math.max(e.confidence, 0), 100),
            location: e.location,
          }))
      : [],
  };
}

/**
 * Parse an OpenAI text response when JSON parsing fails.
 */
function parseTextResponse(response: string, job: Job): AIAnalysis {
  const confidence =
    extractNumberFromText(response, /confidence[:\s]*(\d+)/i) || 85;

  const detectedItems = extractListFromText(
    response,
    /detected.{0,20}items?[:\s]*([^\n]*(?:\n(?!detected|safety|recommended|complexity|tools|duration)[^\n]*)*)/i
  );

  const safetyConcerns = extractSafetyConcerns(response);

  const recommendedActions = extractListFromText(
    response,
    /recommended.{0,20}actions?[:\s]*([^\n]*(?:\n(?!detected|safety|recommended|complexity|tools|duration)[^\n]*)*)/i
  );

  const complexity = extractComplexity(response);

  const suggestedTools = extractListFromText(
    response,
    /tools?[:\s]*([^\n]*(?:\n(?!detected|safety|recommended|complexity|tools|duration)[^\n]*)*)/i
  );

  const duration = extractDuration(response);

  return {
    confidence,
    detectedItems: detectedItems.length > 0 ? detectedItems : ['AI-analyzed maintenance issue'],
    safetyConcerns,
    recommendedActions: recommendedActions.length > 0 ? recommendedActions : ['Follow standard maintenance procedures'],
    estimatedComplexity: complexity,
    suggestedTools: suggestedTools.length > 0 ? suggestedTools : ['Standard maintenance tools'],
    estimatedDuration: duration,
    detectedEquipment: generateRealisticEquipment(job),
  };
}

/**
 * Perform a single OpenAI API request with an abort signal.
 */
async function performRequest(
  job: Job,
  signal: AbortSignal,
  apiKey: string
): Promise<AIAnalysis> {
  const systemPrompt = `You are an expert maintenance professional analyzing job photos.
      Respond in JSON format with this exact structure:
      {
        "confidence": number (0-100),
        "detectedItems": string array,
        "safetyConcerns": [{"concern": string, "severity": "Low"|"Medium"|"High", "description": string}],
        "recommendedActions": string array,
        "estimatedComplexity": "Low"|"Medium"|"High",
        "suggestedTools": string array,
        "estimatedDuration": string,
        "detectedEquipment": [{"name": string, "confidence": number, "location": string}]
      }`;

  const userPrompt = `Analyze this ${job.category || 'maintenance'} job:

      Title: ${job.title}
      Description: ${job.description}
      Category: ${job.category || 'general'}
      Priority: ${job.priority || 'medium'}
      Location: ${job.location}
      Budget: $${job.budget}

      Focus on safety, required tools, and realistic time estimates.`;

  const messages: unknown[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content:
        job.photos && job.photos.length > 0
          ? [
              { type: 'text', text: userPrompt },
              ...job.photos.slice(0, 4).map((photo) => ({
                type: 'image_url',
                image_url: { url: photo, detail: 'auto' },
              })),
            ]
          : [{ type: 'text', text: userPrompt }],
    },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:
        job.photos && job.photos.length > 0
          ? aiConfig.openai.models.vision
          : aiConfig.openai.models.chat,
      messages,
      max_tokens: aiConfig.openai.maxTokens.vision,
      temperature: aiConfig.openai.temperature,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 401 || response.status === 403) {
      logger.error('RealAIAnalysisService', 'Invalid or expired OpenAI API key', {
        status: response.status,
        error: errorText,
      });
      throw new Error('Invalid API key - authentication failed');
    }

    if (response.status === 429) {
      logger.warn('RealAIAnalysisService', 'OpenAI rate limit exceeded');
      throw new Error('Rate limit exceeded - please try again later');
    }

    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI API returned empty or invalid response');
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedResponse = JSON.parse(jsonMatch[0]);
      return validateAndFormatResponse(parsedResponse, job);
    }
  } catch (parseError) {
    logger.warn('Failed to parse OpenAI JSON response, using text parsing');
  }

  return parseTextResponse(content, job);
}

/**
 * Analyze a job using OpenAI GPT-4 Vision with timeout and retry logic.
 *
 * - 30-second timeout prevents hanging requests
 * - Exponential backoff retry (max 2 retries)
 * - AbortController for proper request cancellation
 */
export async function analyzeWithOpenAI(
  job: Job,
  apiKey: string
): Promise<AIAnalysis> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const result = await performRequest(job, controller.signal, apiKey);
        clearTimeout(timeoutId);
        return result;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('403') ||
          errorMessage.includes('400') ||
          errorMessage.includes('429') ||
          errorMessage.includes('invalid api key') ||
          errorMessage.includes('authentication failed') ||
          errorMessage.includes('rate limit') ||
          (errorMessage.includes('abort') && attempt === MAX_RETRIES)
        ) {
          logger.warn('RealAIAnalysisService', 'Non-retryable OpenAI error', { error: errorMessage });
          throw error;
        }
      }

      if (attempt === MAX_RETRIES) {
        throw lastError;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      logger.info('RealAIAnalysisService', `Retrying OpenAI request after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('OpenAI analysis failed after retries');
}

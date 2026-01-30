/**
 * GPT-4 Vision API client for custom image analysis.
 */

import { logger } from '@mintenance/shared';
import { CostControlService } from '../CostControlService';
import { fetchWithOpenAIRetry } from '@/lib/utils/openai-rate-limit';

export interface GPT4VisionResult {
  success: boolean;
  data?: unknown;
  cost?: number;
}

/**
 * Call GPT-4 Vision API directly for custom analysis.
 */
export async function callGPT4Vision(
  images: string[],
  prompt: string,
  service: string
): Promise<GPT4VisionResult> {
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

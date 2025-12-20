/**
 * Mock utilities for AI services
 * Shared mocks for OpenAI, Google Vision, and other AI APIs
 */

import { vi } from 'vitest';

/**
 * Mock OpenAI embedding response
 */
export function mockOpenAIEmbedding(dimension: number = 1536) {
  return {
    data: [
      {
        embedding: new Array(dimension).fill(0).map(() => Math.random()),
        index: 0,
        object: 'embedding',
      },
    ],
    model: 'text-embedding-3-small',
    object: 'list',
    usage: {
      prompt_tokens: 10,
      total_tokens: 10,
    },
  };
}

/**
 * Mock OpenAI chat completion response
 */
export function mockOpenAIChatCompletion(content: string | object) {
  const contentString =
    typeof content === 'object' ? JSON.stringify(content) : content;

  return {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4-vision-preview',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: contentString,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  };
}

/**
 * Mock Google Vision API label detection response
 */
export function mockVisionLabelDetection(labels: Array<{ description: string; score: number }>) {
  return [
    {
      labelAnnotations: labels,
    },
  ];
}

/**
 * Mock Google Vision API object localization response
 */
export function mockVisionObjectLocalization(objects: Array<{ name: string; score: number }>) {
  return [
    {
      localizedObjectAnnotations: objects,
    },
  ];
}

/**
 * Mock Google Vision API text detection response
 */
export function mockVisionTextDetection(textAnnotations: Array<{ description: string }>) {
  return [
    {
      textAnnotations,
    },
  ];
}

/**
 * Mock AbortController for timeout tests
 */
export function mockAbortController() {
  const controller = new AbortController();
  const abortSpy = vi.spyOn(controller, 'abort');

  return { controller, abortSpy };
}

/**
 * Mock fetch with timeout simulation
 */
export function mockFetchWithTimeout(timeoutMs: number, shouldTimeout: boolean = true) {
  return vi.fn(() => {
    if (shouldTimeout) {
      return new Promise((_, reject) => {
        setTimeout(() => {
          const error: any = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        }, timeoutMs);
      });
    }

    return Promise.resolve({
      ok: true,
      json: async () => mockOpenAIEmbedding(),
    });
  });
}

/**
 * Mock rate limiter responses
 */
export function mockRateLimiterAllowed(remaining: number = 9) {
  return {
    allowed: true,
    remaining,
    resetTime: Date.now() + 60000,
  };
}

export function mockRateLimiterExceeded(retryAfter: number = 60) {
  return {
    allowed: false,
    remaining: 0,
    resetTime: Date.now() + retryAfter * 1000,
    retryAfter,
  };
}

/**
 * Mock AI analysis result
 */
export function mockAIAnalysisResult(overrides?: Partial<any>) {
  return {
    confidence: 85,
    detectedItems: ['Test item 1', 'Test item 2'],
    safetyConcerns: [
      {
        concern: 'Test concern',
        severity: 'Medium' as const,
        description: 'Test description',
      },
    ],
    recommendedActions: ['Test action 1', 'Test action 2'],
    estimatedComplexity: 'Medium' as const,
    suggestedTools: ['Tool 1', 'Tool 2'],
    estimatedDuration: '2-3 hours',
    detectedEquipment: [],
    ...overrides,
  };
}

/**
 * Create a mock LRU cache for testing
 */
export function createMockLRUCache() {
  const cache = new Map();

  return {
    get: vi.fn((key: string) => cache.get(key)),
    set: vi.fn((key: string, value: any) => cache.set(key, value)),
    has: vi.fn((key: string) => cache.has(key)),
    delete: vi.fn((key: string) => cache.delete(key)),
    clear: vi.fn(() => cache.clear()),
    get size() {
      return cache.size;
    },
    purgeStale: vi.fn(),
  };
}

/**
 * Advance timers and flush promises
 */
export async function advanceTimersAndFlush(ms: number) {
  vi.advanceTimersByTime(ms);
  await new Promise((resolve) => setImmediate(resolve));
}

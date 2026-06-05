/**
 * Unit tests for openai-provider — OpenAI GPT-4 Vision job-photo analyzer.
 *
 * Strategy:
 *   - The unit under test (analyzeWithOpenAI / performRequest / response
 *     parsing) is NOT mocked.
 *   - Externals mocked:
 *       * global `fetch` — the HTTP transport (we assert exact request
 *         URL, headers, model selection, messages, max_tokens, temperature
 *         and craft the response bodies / status codes / errors).
 *       * `logger` — info/warn/error sink.
 *       * `aiConfig` — pinned model names + token limits + temperature so
 *         payload assertions are deterministic AND so the real ai.config
 *         module-load security validation never runs.
 *   - `text-extraction` and `fallback-analysis` are the real
 *     implementations (they are part of the parsing behaviour we want to
 *     exercise), EXCEPT `generateRealisticEquipment` uses Math.random; we
 *     pin Math.random for determinism rather than mocking the module.
 *
 * Coverage targets the GAP branches: model/message/payload building (with
 * & without photos, >4 photos), JSON happy path + every validateAndFormat
 * fallback branch, text-fallback parsing, empty content, error handling
 * (401/403/429/other non-ok), retry success, non-retryable short-circuit,
 * retries-exhausted, and abort/timeout.
 */

import type { Job } from '@mintenance/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../config/ai.config', () => ({
  aiConfig: {
    openai: {
      apiKey: '',
      models: {
        vision: 'gpt-4-vision-preview',
        chat: 'gpt-4-turbo-preview',
        embedding: 'text-embedding-3-small',
      },
      maxTokens: { vision: 800, chat: 1000, embedding: 8191 },
      temperature: 0.1,
    },
  },
}));

import { analyzeWithOpenAI } from '../openai-provider';
import { logger } from '../../../utils/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_KEY = 'sk-test-key';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    title: 'Leaking tap',
    description: 'The kitchen sink tap is dripping constantly',
    category: 'plumbing',
    priority: 'high',
    location: 'London',
    budget: 200,
    photos: [],
    ...overrides,
  } as unknown as Job;
}

function okResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      choices: [{ message: { content } }],
    }),
    text: jest.fn().mockResolvedValue(''),
  };
}

function errorResponse(status: number, body = 'boom') {
  return {
    ok: false,
    status,
    json: jest.fn(),
    text: jest.fn().mockResolvedValue(body),
  };
}

const fullJsonContent = JSON.stringify({
  confidence: 92,
  detectedItems: ['Dripping tap', 'Worn washer'],
  safetyConcerns: [
    { concern: 'Water on floor', severity: 'High', description: 'Slip hazard' },
  ],
  recommendedActions: ['Shut off water', 'Replace washer'],
  estimatedComplexity: 'Low',
  suggestedTools: ['Wrench', 'Washer kit'],
  estimatedDuration: '1-2 hours',
  detectedEquipment: [
    { name: 'Tap', confidence: 88, location: 'Kitchen sink' },
  ],
});

let fetchMock: jest.Mock;
let randomSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  fetchMock = jest.fn();
  // @ts-expect-error - assigning to global fetch in test env
  global.fetch = fetchMock;
  // Pin Math.random so fallback-analysis equipment generation is deterministic.
  randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
});

afterEach(() => {
  randomSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// Request building
// ---------------------------------------------------------------------------

describe('analyzeWithOpenAI — request building', () => {
  it('builds a chat-model request (no photos) with correct URL, headers, and payload', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(fullJsonContent));

    await analyzeWithOpenAI(makeJob({ photos: [] }), API_KEY);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(`Bearer ${API_KEY}`);
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.signal).toBeDefined();

    const body = JSON.parse(init.body);
    expect(body.model).toBe('gpt-4-turbo-preview'); // chat model when no photos
    expect(body.max_tokens).toBe(800);
    expect(body.temperature).toBe(0.1);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    // No photos => user content is a single text block array
    expect(body.messages[1].content).toEqual([
      { type: 'text', text: expect.stringContaining('Leaking tap') },
    ]);
    expect(body.messages[1].content[0].text).toContain('$200');
  });

  it('builds a vision-model request with image_url blocks and caps photos at 4', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(fullJsonContent));
    const photos = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

    await analyzeWithOpenAI(makeJob({ photos }), API_KEY);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4-vision-preview'); // vision model with photos
    const content = body.messages[1].content;
    // 1 text block + 4 image blocks (capped from 6)
    expect(content).toHaveLength(5);
    expect(content[0]).toEqual({ type: 'text', text: expect.any(String) });
    expect(content.slice(1)).toEqual([
      { type: 'image_url', image_url: { url: 'p1', detail: 'auto' } },
      { type: 'image_url', image_url: { url: 'p2', detail: 'auto' } },
      { type: 'image_url', image_url: { url: 'p3', detail: 'auto' } },
      { type: 'image_url', image_url: { url: 'p4', detail: 'auto' } },
    ]);
  });

  it('falls back to default category/priority strings in the prompt when missing', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(fullJsonContent));

    await analyzeWithOpenAI(
      makeJob({ category: undefined, priority: undefined, photos: [] }),
      API_KEY
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const text = body.messages[1].content[0].text;
    expect(text).toContain('Analyze this maintenance job'); // category fallback
    expect(text).toContain('Category: general');
    expect(text).toContain('Priority: medium');
  });
});

// ---------------------------------------------------------------------------
// Response parsing — JSON happy path + validateAndFormat branches
// ---------------------------------------------------------------------------

describe('analyzeWithOpenAI — JSON response parsing', () => {
  it('parses a complete valid JSON response and clamps/maps fields', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(fullJsonContent));

    const result = await analyzeWithOpenAI(
      makeJob({ photos: ['p1'] }),
      API_KEY
    );

    expect(result.confidence).toBe(92);
    expect(result.detectedItems).toEqual(['Dripping tap', 'Worn washer']);
    expect(result.safetyConcerns).toEqual([
      {
        concern: 'Water on floor',
        severity: 'High',
        description: 'Slip hazard',
      },
    ]);
    expect(result.recommendedActions).toEqual([
      'Shut off water',
      'Replace washer',
    ]);
    expect(result.estimatedComplexity).toBe('Low');
    expect(result.suggestedTools).toEqual(['Wrench', 'Washer kit']);
    expect(result.estimatedDuration).toBe('1-2 hours');
    expect(result.detectedEquipment).toEqual([
      { name: 'Tap', confidence: 88, location: 'Kitchen sink' },
    ]);
  });

  it('extracts JSON embedded in surrounding prose via regex match', async () => {
    const content = `Here is my analysis:\n${fullJsonContent}\nThanks!`;
    fetchMock.mockResolvedValueOnce(okResponse(content));

    const result = await analyzeWithOpenAI(makeJob(), API_KEY);
    expect(result.confidence).toBe(92);
  });

  it('clamps out-of-range confidence and equipment confidence into [0,100]', async () => {
    const content = JSON.stringify({
      confidence: 250,
      detectedEquipment: [
        { name: 'X', confidence: 999, location: 'L' },
        { name: 'Y', confidence: -50, location: 'M' },
      ],
    });
    fetchMock.mockResolvedValueOnce(okResponse(content));

    const result = await analyzeWithOpenAI(makeJob(), API_KEY);
    expect(result.confidence).toBe(100);
    expect(result.detectedEquipment).toEqual([
      { name: 'X', confidence: 100, location: 'L' },
      { name: 'Y', confidence: 0, location: 'M' },
    ]);
  });

  it('applies every default branch when JSON fields are missing/wrong types', async () => {
    const content = JSON.stringify({
      // confidence missing -> 75
      detectedItems: 'not-an-array',
      safetyConcerns: 'nope',
      recommendedActions: 123,
      estimatedComplexity: 'Bogus',
      suggestedTools: null,
      estimatedDuration: 999,
      detectedEquipment: 'nope',
    });
    fetchMock.mockResolvedValueOnce(okResponse(content));

    const result = await analyzeWithOpenAI(makeJob(), API_KEY);
    expect(result.confidence).toBe(75);
    expect(result.detectedItems).toEqual(['AI analysis completed']);
    expect(result.safetyConcerns).toEqual([
      {
        concern: 'Standard safety precautions',
        severity: 'Medium',
        description:
          'Follow appropriate safety protocols for this type of work',
      },
    ]);
    expect(result.recommendedActions).toEqual([
      'Assess the situation thoroughly',
      'Gather necessary tools and materials',
      'Follow safety protocols',
    ]);
    expect(result.estimatedComplexity).toBe('Medium'); // invalid -> Medium
    expect(result.suggestedTools).toEqual(['Basic tools required']);
    expect(result.estimatedDuration).toBe('2-4 hours'); // non-string -> default
    expect(result.detectedEquipment).toEqual([]);
  });

  it('filters non-string array members and invalid safety/equipment shapes', async () => {
    const content = JSON.stringify({
      confidence: 50,
      detectedItems: ['ok', 5, null, 'good'],
      safetyConcerns: [
        { concern: 'Valid', severity: 'WeirdSeverity', description: 'd' }, // severity coerced to Medium
        { concern: 'bad' }, // invalid shape -> filtered out
        'string-not-object', // filtered
      ],
      recommendedActions: ['a', {}, 'b'],
      estimatedComplexity: 'High',
      suggestedTools: ['t1', 42],
      estimatedDuration: '5 hours',
      detectedEquipment: [
        { name: 'good', confidence: 70, location: 'here' },
        { name: 'bad', confidence: 'NaN', location: 'x' }, // invalid -> filtered
      ],
    });
    fetchMock.mockResolvedValueOnce(okResponse(content));

    const result = await analyzeWithOpenAI(makeJob(), API_KEY);
    expect(result.detectedItems).toEqual(['ok', 'good']);
    expect(result.safetyConcerns).toEqual([
      { concern: 'Valid', severity: 'Medium', description: 'd' },
    ]);
    expect(result.recommendedActions).toEqual(['a', 'b']);
    expect(result.estimatedComplexity).toBe('High');
    expect(result.suggestedTools).toEqual(['t1']);
    expect(result.estimatedDuration).toBe('5 hours');
    expect(result.detectedEquipment).toEqual([
      { name: 'good', confidence: 70, location: 'here' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Text fallback parsing
// ---------------------------------------------------------------------------

describe('analyzeWithOpenAI — text fallback parsing', () => {
  it('parses a structured plain-text response when no JSON object is present', async () => {
    const text = [
      'confidence: 70',
      'detected items: cracked pipe, corrosion',
      'safety concerns: electrical hazard near water',
      'recommended actions: isolate supply, call electrician',
      'complexity: high',
      'tools: multimeter, wrench',
      'duration: 3-5 hours',
    ].join('\n');
    fetchMock.mockResolvedValueOnce(okResponse(text));

    const result = await analyzeWithOpenAI(
      makeJob({ category: 'electrical', description: 'panel' }),
      API_KEY
    );

    expect(result.confidence).toBe(70);
    expect(result.detectedItems.length).toBeGreaterThan(0);
    expect(result.estimatedComplexity).toBe('High');
    expect(result.estimatedDuration).toBe('3-5 hours');
    // safetyConcerns derived from text -> electrical => High severity
    expect(result.safetyConcerns[0].severity).toBe('High');
    // detectedEquipment comes from generateRealisticEquipment (fallback)
    expect(Array.isArray(result.detectedEquipment)).toBe(true);
  });

  it('uses default fallbacks when text contains no recognizable fields', async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse('totally unstructured prose with no markers')
    );

    const result = await analyzeWithOpenAI(
      makeJob({ category: 'general' }),
      API_KEY
    );

    expect(result.confidence).toBe(85); // default when no confidence match
    expect(result.detectedItems).toEqual(['AI-analyzed maintenance issue']);
    expect(result.recommendedActions).toEqual([
      'Follow standard maintenance procedures',
    ]);
    expect(result.estimatedComplexity).toBe('Medium');
    expect(result.suggestedTools).toEqual(['Standard maintenance tools']);
    expect(result.estimatedDuration).toBe('2-4 hours');
    expect(result.safetyConcerns[0].concern).toBe(
      'Standard safety precautions'
    );
  });

  it('logs a warning and falls back to text parsing when JSON.parse throws on malformed JSON', async () => {
    // Has braces (regex matches) but invalid JSON inside -> JSON.parse throws.
    fetchMock.mockResolvedValueOnce(
      okResponse('{ this is : not, valid json } duration: 9 hours')
    );

    const result = await analyzeWithOpenAI(makeJob(), API_KEY);

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to parse OpenAI JSON response, using text parsing'
    );
    expect(result.estimatedDuration).toBe('9 hours');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('analyzeWithOpenAI — error handling', () => {
  it('throws auth error and does NOT retry on 401', async () => {
    fetchMock.mockResolvedValue(errorResponse(401, 'unauthorized'));

    await expect(analyzeWithOpenAI(makeJob(), API_KEY)).rejects.toThrow(
      'Invalid API key - authentication failed'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'RealAIAnalysisService',
      'Invalid or expired OpenAI API key',
      expect.objectContaining({ status: 401 })
    );
  });

  it('throws auth error on 403 without retry', async () => {
    fetchMock.mockResolvedValue(errorResponse(403, 'forbidden'));

    await expect(analyzeWithOpenAI(makeJob(), API_KEY)).rejects.toThrow(
      'Invalid API key - authentication failed'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws rate-limit error and does NOT retry on 429', async () => {
    fetchMock.mockResolvedValue(errorResponse(429));

    await expect(analyzeWithOpenAI(makeJob(), API_KEY)).rejects.toThrow(
      'Rate limit exceeded - please try again later'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'RealAIAnalysisService',
      'OpenAI rate limit exceeded'
    );
  });

  it('throws empty-response error when choices content is missing', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ choices: [{ message: {} }] }),
      text: jest.fn(),
    });

    // 400-class message? No — empty response is retryable; with 3 attempts it
    // still ends throwing the same error after retries are exhausted.
    jest.useFakeTimers();
    const p = analyzeWithOpenAI(makeJob(), API_KEY);
    const assertion = expect(p).rejects.toThrow(
      'OpenAI API returned empty or invalid response'
    );
    await jest.runAllTimersAsync();
    await assertion;
    jest.useRealTimers();
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('throws a non-retryable error directly when message contains 400', async () => {
    fetchMock.mockResolvedValue(errorResponse(400, 'bad request'));

    await expect(analyzeWithOpenAI(makeJob(), API_KEY)).rejects.toThrow(
      /OpenAI API error 400/
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------

describe('analyzeWithOpenAI — retry logic', () => {
  it('retries a retryable (500) error then succeeds on the second attempt', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(500, 'server error'))
      .mockResolvedValueOnce(okResponse(fullJsonContent));

    jest.useFakeTimers();
    const p = analyzeWithOpenAI(makeJob(), API_KEY);
    await jest.runAllTimersAsync();
    const result = await p;
    jest.useRealTimers();

    expect(result.confidence).toBe(92);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(
      'RealAIAnalysisService',
      expect.stringContaining('Retrying OpenAI request')
    );
  });

  it('exhausts retries on persistent 500 and throws the last error', async () => {
    fetchMock.mockResolvedValue(errorResponse(503, 'unavailable'));

    jest.useFakeTimers();
    const p = analyzeWithOpenAI(makeJob(), API_KEY);
    const assertion = expect(p).rejects.toThrow(/OpenAI API error 503/);
    await jest.runAllTimersAsync();
    await assertion;
    jest.useRealTimers();

    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + MAX_RETRIES(2)
  });

  it('wraps non-Error throwables into an Error and retries', async () => {
    fetchMock
      .mockRejectedValueOnce('string failure')
      .mockResolvedValueOnce(okResponse(fullJsonContent));

    jest.useFakeTimers();
    const p = analyzeWithOpenAI(makeJob(), API_KEY);
    await jest.runAllTimersAsync();
    const result = await p;
    jest.useRealTimers();

    expect(result.confidence).toBe(92);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Timeout / abort
// ---------------------------------------------------------------------------

describe('analyzeWithOpenAI — timeout / abort', () => {
  it('aborts the request after the timeout and throws once retries are exhausted', async () => {
    // fetch rejects with an abort-like error each time it is called; the
    // provider treats "abort" as non-retryable only on the final attempt,
    // so earlier attempts retry and the final one throws.
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            reject(new Error('The operation was aborted'));
          });
        });
      }
    );

    jest.useFakeTimers();
    const p = analyzeWithOpenAI(makeJob(), API_KEY);
    const assertion = expect(p).rejects.toThrow(/aborted/);
    await jest.runAllTimersAsync();
    await assertion;
    jest.useRealTimers();

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

/**
 * Comprehensive tests for AI Embedding Generation API
 *
 * Tests all critical bugs fixed:
 * - Real OpenAI integration with timeout protection
 * - CSRF protection
 * - Rate limiting handling (429)
 * - Invalid API key handling (401)
 * - Request timeout (30s)
 * - Input validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../generate-embedding/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/csrf', () => ({
  requireCSRF: vi.fn(),
}));

vi.mock('@/lib/openai-client', () => ({
  openai: {
    embeddings: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { requireCSRF } from '@/lib/csrf';
import { openai } from '@/lib/openai-client';

describe('POST /api/ai/generate-embedding', () => {
  const mockEmbedding = new Array(1536).fill(0).map((_, i) => Math.random());

  beforeEach(() => {
    vi.clearAllMocks();
    // Set API key by default
    process.env.OPENAI_API_KEY = 'sk-test-key-123456789012345678901234567890';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('Input Validation', () => {
    it('should return 400 for missing text', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Text is required');
    });

    it('should return 400 for non-string text', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 123 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('must be a string');
    });

    it('should return 400 for text exceeding 32000 characters', async () => {
      const longText = 'a'.repeat(32001);
      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: longText }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('too long');
      expect(data.error).toContain('32000');
    });

    it('should accept text at exactly 32000 characters', async () => {
      const maxText = 'a'.repeat(32000);

      vi.mocked(openai.embeddings.create).mockResolvedValue({
        data: [{ embedding: mockEmbedding, index: 0, object: 'embedding' }],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 100, total_tokens: 100 },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: maxText }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('API Configuration', () => {
    it('should return 503 when OpenAI API key not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('not configured');
    });

    it('should return 503 for invalid API key (401 from OpenAI)', async () => {
      const error: any = new Error('Invalid API key');
      error.status = 401;

      vi.mocked(openai.embeddings.create).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('Invalid API configuration');
    });
  });

  describe('Timeout Protection', () => {
    it('should timeout after 30 seconds and return 504', async () => {
      // Mock a hanging request
      vi.mocked(openai.embeddings.create).mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(resolve, 35000); // Longer than timeout
        })
      );

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      // Use fake timers for this test
      vi.useFakeTimers();

      const responsePromise = POST(request);

      // Fast-forward time
      vi.advanceTimersByTime(30000);

      const response = await responsePromise;
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error).toContain('timeout');

      vi.useRealTimers();
    }, 10000);

    it('should handle AbortError correctly', async () => {
      const abortError: any = new Error('Aborted');
      abortError.name = 'AbortError';

      vi.mocked(openai.embeddings.create).mockRejectedValue(abortError);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error).toContain('timeout');
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when OpenAI rate limit exceeded', async () => {
      const error: any = new Error('Rate limit exceeded');
      error.status = 429;

      vi.mocked(openai.embeddings.create).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Rate limit exceeded');
    });
  });

  describe('CSRF Protection', () => {
    it('should call requireCSRF before processing', async () => {
      vi.mocked(openai.embeddings.create).mockResolvedValue({
        data: [{ embedding: mockEmbedding, index: 0, object: 'embedding' }],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      await POST(request);

      expect(requireCSRF).toHaveBeenCalledWith(request);
    });

    it('should reject request if CSRF validation fails', async () => {
      vi.mocked(requireCSRF).mockRejectedValue(new Error('CSRF validation failed'));

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Successful Embedding Generation', () => {
    it('should generate embeddings with valid input', async () => {
      vi.mocked(openai.embeddings.create).mockResolvedValue({
        data: [{ embedding: mockEmbedding, index: 0, object: 'embedding' }],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test maintenance issue' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.embedding).toBeDefined();
      expect(Array.isArray(data.embedding)).toBe(true);
      expect(data.embedding.length).toBe(1536);
      expect(data.model).toBe('text-embedding-3-small');
      expect(data.usage).toBeDefined();
    });

    it('should return embedding with correct dimensions (1536 for text-embedding-3-small)', async () => {
      vi.mocked(openai.embeddings.create).mockResolvedValue({
        data: [{ embedding: mockEmbedding, index: 0, object: 'embedding' }],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.embedding.length).toBe(1536);
    });

    it('should support custom model parameter', async () => {
      const largeEmbedding = new Array(3072).fill(0).map(() => Math.random());

      vi.mocked(openai.embeddings.create).mockResolvedValue({
        data: [{ embedding: largeEmbedding, index: 0, object: 'embedding' }],
        model: 'text-embedding-3-large',
        object: 'list',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'test',
          model: 'text-embedding-3-large'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.model).toBe('text-embedding-3-large');
      expect(data.embedding.length).toBe(3072);
    });

    it('should handle empty embedding response as error', async () => {
      vi.mocked(openai.embeddings.create).mockResolvedValue({
        data: [],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle malformed embedding response', async () => {
      vi.mocked(openai.embeddings.create).mockResolvedValue({
        data: [{ embedding: 'not-an-array', index: 0, object: 'embedding' }],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(openai.embeddings.create).mockRejectedValue(
        new Error('Network error')
      );

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate embedding');
    });

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      vi.mocked(openai.embeddings.create).mockRejectedValue(
        new Error('Detailed error message')
      );

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.details).toBe('Detailed error message');

      process.env.NODE_ENV = originalEnv;
    });

    it('should NOT include error details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      vi.mocked(openai.embeddings.create).mockRejectedValue(
        new Error('Sensitive error message')
      );

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Performance Logging', () => {
    it('should log successful embedding generation with metrics', async () => {
      const { logger } = await import('@mintenance/shared');

      vi.mocked(openai.embeddings.create).mockResolvedValue({
        data: [{ embedding: mockEmbedding, index: 0, object: 'embedding' }],
        model: 'text-embedding-3-small',
        object: 'list',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/ai/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });

      await POST(request);

      expect(logger.info).toHaveBeenCalledWith(
        'Embedding generated successfully',
        expect.objectContaining({
          service: 'ai_embedding',
          model: 'text-embedding-3-small',
          embeddingDimension: 1536,
          durationMs: expect.any(Number),
        })
      );
    });
  });
});

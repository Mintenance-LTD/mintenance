import { NextRequest, NextResponse } from 'next/server';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { openai } from '@/lib/openai-client';
import { rateLimiter, checkAIUserRateLimit } from '@/lib/rate-limiter';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AIResponseCache } from '@/lib/services/cache/AIResponseCache';

/**
 * Generate embeddings using OpenAI API
 * POST /api/ai/generate-embedding
 * Body: { text: string, model?: string }
 *
 * OWASP Security: Rate limited to 10 requests per minute per IP
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting - OWASP best practice: limit expensive AI operations
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       request.headers.get('x-real-ip') ||
                       'anonymous';

    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `ai-embedding:${identifier}`,
      windowMs: 60000, // 1 minute
      maxRequests: 10, // 10 requests per minute (expensive AI calls)
    });

    if (!rateLimitResult.allowed) {
      logger.warn('AI embedding rate limit exceeded', {
        service: 'ai_embedding',
        identifier,
        remaining: rateLimitResult.remaining,
        retryAfter: rateLimitResult.retryAfter,
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    // CSRF protection
    await requireCSRF(request);

    // Per-user rate limit if authenticated
    try {
      const { data: { user } } = await serverSupabase.auth.getUser();
      if (user) {
        const userRateLimit = await checkAIUserRateLimit(user.id);
        if (!userRateLimit.allowed) {
          logger.warn('AI embedding per-user rate limit exceeded', {
            service: 'ai_embedding',
            userId: user.id,
          });
          return NextResponse.json(
            { error: 'You have exceeded your AI request limit. Please try again shortly.' },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': '3',
                'X-RateLimit-Remaining': String(userRateLimit.remaining),
                'X-RateLimit-Reset': String(Math.ceil(userRateLimit.resetTime / 1000)),
                'Retry-After': String(userRateLimit.retryAfter || 60),
              },
            }
          );
        }
      }
    } catch {
      // Auth check is best-effort for rate limiting; don't block embedding if auth fails
    }

    const { text, model = 'text-embedding-3-small' } = await request.json();

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate text length (OpenAI limit is ~8191 tokens for ada-002, ~8191 for text-embedding-3-*)
    if (text.length > 32000) {
      return NextResponse.json(
        { error: 'Text is too long (max 32000 characters)' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OPENAI_API_KEY not configured', {
        service: 'ai_embedding',
      });
      return NextResponse.json(
        { error: 'OpenAI API is not configured' },
        { status: 503 }
      );
    }

    // Use cache to avoid redundant API calls
    // Cache key includes text and model for consistency
    const cacheInput = { text, model };

    const result = await AIResponseCache.get(
      'embeddings',
      cacheInput,
      async () => {
        // Call OpenAI API with timeout and retry logic
        const timeoutMs = 30000; // 30 seconds
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await openai.embeddings.create(
            {
              model,
              input: text,
              encoding_format: 'float',
            },
            {
              signal: controller.signal as AbortSignal,
            }
          );

          clearTimeout(timeout);

          // Extract embedding from response
          const embedding = response.data[0]?.embedding;

          if (!embedding || !Array.isArray(embedding)) {
            throw new Error('Invalid embedding response from OpenAI');
          }

          return {
            embedding,
            model,
            usage: response.usage,
          };
        } finally {
          clearTimeout(timeout);
        }
      }
    );

    const duration = Date.now() - startTime;
    logger.info('Embedding generated successfully', {
      service: 'ai_embedding',
      model,
      textLength: text.length,
      embeddingDimension: result.embedding.length,
      durationMs: duration,
      cached: duration < 50, // Cached responses are typically <50ms
    });

    return NextResponse.json(result);

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const err = error as Error;

    logger.error('Embedding generation error', {
      service: 'ai_embedding',
      error: err?.message || 'Unknown error',
      errorType: err?.constructor?.name,
      durationMs: duration,
    });

    return NextResponse.json(
      {
        error: 'Failed to generate embedding',
        details: process.env.NODE_ENV === 'development' ? err?.message : undefined,
      },
      { status: 500 }
    );
  }
}

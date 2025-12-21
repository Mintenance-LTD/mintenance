import { NextRequest, NextResponse } from 'next/server';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { openai } from '@/lib/openai-client';
import { rateLimiter } from '@/lib/rate-limiter';

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
          signal: controller.signal as any,
        }
      );

      clearTimeout(timeout);

      // Extract embedding from response
      const embedding = response.data[0]?.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response from OpenAI');
      }

      const duration = Date.now() - startTime;
      logger.info('Embedding generated successfully', {
        service: 'ai_embedding',
        model,
        textLength: text.length,
        embeddingDimension: embedding.length,
        durationMs: duration,
      });

      return NextResponse.json({
        embedding,
        model,
        usage: response.usage,
      });

    } catch (apiError: any) {
      clearTimeout(timeout);

      // Handle timeout
      if (apiError.name === 'AbortError') {
        logger.error('Embedding generation timeout', {
          service: 'ai_embedding',
          model,
          textLength: text.length,
          timeoutMs,
        });
        return NextResponse.json(
          { error: 'Request timeout - embedding generation took too long' },
          { status: 504 }
        );
      }

      // Handle rate limiting
      if (apiError.status === 429) {
        logger.warn('OpenAI rate limit exceeded', {
          service: 'ai_embedding',
          error: apiError.message,
        });
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      // Handle invalid API key
      if (apiError.status === 401) {
        logger.error('Invalid OpenAI API key', {
          service: 'ai_embedding',
        });
        return NextResponse.json(
          { error: 'Invalid API configuration' },
          { status: 503 }
        );
      }

      // Re-throw for generic error handler
      throw apiError;
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Embedding generation error', {
      service: 'ai_embedding',
      error: error?.message || 'Unknown error',
      errorType: error?.constructor?.name,
      durationMs: duration,
    });

    return NextResponse.json(
      {
        error: 'Failed to generate embedding',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

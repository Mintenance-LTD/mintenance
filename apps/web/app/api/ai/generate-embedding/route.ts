import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { openai } from '@/lib/openai-client';
import { rateLimiter, checkAIUserRateLimit } from '@/lib/rate-limiter';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AIResponseCache } from '@/lib/services/cache/AIResponseCache';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getClientIp } from '@/lib/request-ip';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated body
// replaces the manual `typeof text === 'string' && text.length <= 32000`
// pair. `model` is constrained to OpenAI's embedding tiers we actually
// support; an unknown model used to fall through to OpenAI as-is and
// surface a confusing 500.
const generateEmbeddingSchema = z
  .object({
    text: z.string().min(1).max(32000),
    model: z
      .enum([
        'text-embedding-3-small',
        'text-embedding-3-large',
        'text-embedding-ada-002',
      ])
      .default('text-embedding-3-small'),
  })
  .strict();

export const POST = withApiHandler({ rateLimit: false }, async (request) => {
  const startTime = Date.now();

  // Custom AI rate limiting (IP + optional per-user)
  const identifier = getClientIp(request);
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `ai-embedding:${identifier}`,
    windowMs: 60000,
    maxRequests: 10,
  });

  if (!rateLimitResult.allowed) {
    logger.warn('AI embedding rate limit exceeded', {
      service: 'ai_embedding',
      identifier,
      remaining: rateLimitResult.remaining,
    });
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(
            Math.ceil(rateLimitResult.resetTime / 1000)
          ),
          'Retry-After': String(rateLimitResult.retryAfter || 60),
        },
      }
    );
  }

  try {
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (user) {
      const userRateLimit = await checkAIUserRateLimit(user.id);
      if (!userRateLimit.allowed) {
        logger.warn('AI embedding per-user rate limit exceeded', {
          service: 'ai_embedding',
          userId: user.id,
        });
        return NextResponse.json(
          {
            error:
              'You have exceeded your AI request limit. Please try again shortly.',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '3',
              'X-RateLimit-Remaining': String(userRateLimit.remaining),
              'X-RateLimit-Reset': String(
                Math.ceil(userRateLimit.resetTime / 1000)
              ),
              'Retry-After': String(userRateLimit.retryAfter || 60),
            },
          }
        );
      }
    }
  } catch {
    // Auth check is best-effort for rate limiting
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = generateEmbeddingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }
  const { text, model } = parsed.data;
  if (!process.env.OPENAI_API_KEY) {
    logger.error('OPENAI_API_KEY not configured', { service: 'ai_embedding' });
    return NextResponse.json(
      { error: 'OpenAI API is not configured' },
      { status: 503 }
    );
  }

  const result = await AIResponseCache.get(
    'embeddings',
    { text, model },
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await openai.embeddings.create(
          { model, input: text, encoding_format: 'float' },
          { signal: controller.signal as AbortSignal }
        );
        clearTimeout(timeout);
        const embedding = response.data[0]?.embedding;
        if (!embedding || !Array.isArray(embedding))
          throw new Error('Invalid embedding response from OpenAI');
        return { embedding, model, usage: response.usage };
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
    cached: duration < 50,
  });

  return NextResponse.json(result);
});

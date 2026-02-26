import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { openai } from '@/lib/openai-client';
import { rateLimiter, checkAIUserRateLimit } from '@/lib/rate-limiter';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AIResponseCache } from '@/lib/services/cache/AIResponseCache';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const POST = withApiHandler({ rateLimit: false }, async (request) => {
  const startTime = Date.now();

  // Custom AI rate limiting (IP + optional per-user)
  const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';
  const rateLimitResult = await rateLimiter.checkRateLimit({ identifier: `ai-embedding:${identifier}`, windowMs: 60000, maxRequests: 10 });

  if (!rateLimitResult.allowed) {
    logger.warn('AI embedding rate limit exceeded', { service: 'ai_embedding', identifier, remaining: rateLimitResult.remaining });
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {
      status: 429,
      headers: { 'X-RateLimit-Limit': '10', 'X-RateLimit-Remaining': String(rateLimitResult.remaining), 'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)), 'Retry-After': String(rateLimitResult.retryAfter || 60) }
    });
  }

  try {
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (user) {
      const userRateLimit = await checkAIUserRateLimit(user.id);
      if (!userRateLimit.allowed) {
        logger.warn('AI embedding per-user rate limit exceeded', { service: 'ai_embedding', userId: user.id });
        return NextResponse.json({ error: 'You have exceeded your AI request limit. Please try again shortly.' }, {
          status: 429,
          headers: { 'X-RateLimit-Limit': '3', 'X-RateLimit-Remaining': String(userRateLimit.remaining), 'X-RateLimit-Reset': String(Math.ceil(userRateLimit.resetTime / 1000)), 'Retry-After': String(userRateLimit.retryAfter || 60) }
        });
      }
    }
  } catch {
    // Auth check is best-effort for rate limiting
  }

  const { text, model = 'text-embedding-3-small' } = await request.json();

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 });
  }
  if (text.length > 32000) {
    return NextResponse.json({ error: 'Text is too long (max 32000 characters)' }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    logger.error('OPENAI_API_KEY not configured', { service: 'ai_embedding' });
    return NextResponse.json({ error: 'OpenAI API is not configured' }, { status: 503 });
  }

  const result = await AIResponseCache.get('embeddings', { text, model }, async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await openai.embeddings.create({ model, input: text, encoding_format: 'float' }, { signal: controller.signal as AbortSignal });
      clearTimeout(timeout);
      const embedding = response.data[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) throw new Error('Invalid embedding response from OpenAI');
      return { embedding, model, usage: response.usage };
    } finally {
      clearTimeout(timeout);
    }
  });

  const duration = Date.now() - startTime;
  logger.info('Embedding generated successfully', { service: 'ai_embedding', model, textLength: text.length, embeddingDimension: result.embedding.length, durationMs: duration, cached: duration < 50 });

  return NextResponse.json(result);
});

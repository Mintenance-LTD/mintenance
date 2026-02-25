/**
 * Unified AI Analysis API Endpoint
 * Routes to appropriate service based on context.
 */

import { NextResponse } from 'next/server';
import { UnifiedAIService, type AnalysisContext } from '@/lib/services/ai/UnifiedAIService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkAIUserRateLimit, rateLimiter } from '@/lib/rate-limiter';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const POST = withApiHandler({ rateLimit: false }, async (request, { user }) => {
  // Custom AI rate limiting (IP + per-user)
  const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';
  const rateLimitResult = await rateLimiter.checkRateLimit({ identifier: `ai-analyze:${identifier}`, windowMs: 60000, maxRequests: 5 });

  if (!rateLimitResult.allowed) {
    logger.warn('AI analyze rate limit exceeded', { service: 'ai_analyze', identifier, remaining: rateLimitResult.remaining });
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {
      status: 429,
      headers: { 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': String(rateLimitResult.remaining), 'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)), 'Retry-After': String(rateLimitResult.retryAfter || 60) }
    });
  }

  const userRateLimit = await checkAIUserRateLimit(user.id);
  if (!userRateLimit.allowed) {
    logger.warn('AI analyze per-user rate limit exceeded', { service: 'ai_analyze', userId: user.id });
    return NextResponse.json({ error: 'You have exceeded your AI request limit. Please try again shortly.' }, {
      status: 429,
      headers: { 'X-RateLimit-Limit': '3', 'X-RateLimit-Remaining': String(userRateLimit.remaining), 'X-RateLimit-Reset': String(Math.ceil(userRateLimit.resetTime / 1000)), 'Retry-After': String(userRateLimit.retryAfter || 60) }
    });
  }

  const body = await request.json();
  const { images, context } = body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'Images are required' }, { status: 400 });
  }
  if (!context || typeof context !== 'object') {
    return NextResponse.json({ error: 'Context is required' }, { status: 400 });
  }

  const analysisContext: AnalysisContext = { ...context, userId: user.id };

  logger.info('Unified AI analysis requested', { userId: user.id, type: analysisContext.type, imageCount: images.length });

  const result = await UnifiedAIService.analyzeImage(images, analysisContext);

  logger.info('Unified AI analysis completed', { userId: user.id, success: result.success, service: result.service, fallbackUsed: result.fallbackUsed });

  if (!result.success) {
    if (result.error?.code === 'BUDGET_EXCEEDED') {
      return NextResponse.json({ error: 'AI budget exceeded', message: result.error.message, fallbackUsed: result.fallbackUsed }, { status: 429 });
    }
    if (result.error?.code === 'EMERGENCY_STOP') {
      return NextResponse.json({ error: 'AI services temporarily unavailable', message: result.error.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'Analysis failed', message: result.error?.message || 'Unknown error', fallbackUsed: result.fallbackUsed }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data, metadata: { service: result.service, model: result.model, fallbackUsed: result.fallbackUsed, cost: result.cost, processingTime: result.processingTime } });
});

export const GET = withApiHandler({ auth: false }, async () => {
  const status = await UnifiedAIService.getStatus();
  return NextResponse.json(status);
});

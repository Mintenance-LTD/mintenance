/**
 * Unified AI Analysis API Endpoint
 * Routes to appropriate service based on context.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  UnifiedAIService,
  type AnalysisContext,
} from '@/lib/services/ai/UnifiedAIService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkAIUserRateLimit, rateLimiter } from '@/lib/rate-limiter';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getClientIp } from '@/lib/request-ip';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated body
// replaces the manual `Array.isArray(images)` + `typeof context === 'object'`
// checks. `images` is capped at 20 (matches the create-job photoUrls cap)
// and each entry must be an http(s) URL.
const aiAnalyzeSchema = z
  .object({
    images: z.array(z.string().url()).min(1).max(20),
    // `context` carries arbitrary keys downstream (`type`, `propertyId`,
    // `damageType`, etc.) that vary by analysis path — z.record so the
    // schema stays open without losing type safety on the wrapper.
    context: z.record(z.string(), z.unknown()),
  })
  .strict();

export const POST = withApiHandler(
  { rateLimit: false },
  async (request, { user }) => {
    // Custom AI rate limiting (IP + per-user)
    const identifier = getClientIp(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `ai-analyze:${identifier}`,
      windowMs: 60000,
      maxRequests: 5,
    });

    if (!rateLimitResult.allowed) {
      logger.warn('AI analyze rate limit exceeded', {
        service: 'ai_analyze',
        identifier,
        remaining: rateLimitResult.remaining,
      });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(
              Math.ceil(rateLimitResult.resetTime / 1000)
            ),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    const userRateLimit = await checkAIUserRateLimit(user.id);
    if (!userRateLimit.allowed) {
      logger.warn('AI analyze per-user rate limit exceeded', {
        service: 'ai_analyze',
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

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = aiAnalyzeSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }
    const { images, context } = parsed.data;

    // The Zod `context` schema is `Record<string, unknown>` because the
    // shape varies per analysis path; cast to the AnalysisContext
    // discriminated-union here. UnifiedAIService validates `type`
    // again before dispatching, so a missing/invalid `type` still
    // surfaces as a typed error rather than a TS slip.
    const analysisContext = {
      ...context,
      userId: user.id,
    } as AnalysisContext;

    logger.info('Unified AI analysis requested', {
      userId: user.id,
      type: analysisContext.type,
      imageCount: images.length,
    });

    const result = await UnifiedAIService.analyzeImage(images, analysisContext);

    logger.info('Unified AI analysis completed', {
      userId: user.id,
      success: result.success,
      service: result.service,
      fallbackUsed: result.fallbackUsed,
    });

    if (!result.success) {
      if (result.error?.code === 'BUDGET_EXCEEDED') {
        return NextResponse.json(
          {
            error: 'AI budget exceeded',
            message: result.error.message,
            fallbackUsed: result.fallbackUsed,
          },
          { status: 429 }
        );
      }
      if (result.error?.code === 'EMERGENCY_STOP') {
        return NextResponse.json(
          {
            error: 'AI services temporarily unavailable',
            message: result.error.message,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        {
          error: 'Analysis failed',
          message: result.error?.message || 'Unknown error',
          fallbackUsed: result.fallbackUsed,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: {
        service: result.service,
        model: result.model,
        fallbackUsed: result.fallbackUsed,
        cost: result.cost,
        processingTime: result.processingTime,
      },
    });
  }
);

export const GET = withApiHandler({ auth: false }, async () => {
  const status = await UnifiedAIService.getStatus();
  return NextResponse.json(status);
});

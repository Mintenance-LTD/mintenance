/**
 * Unified AI Analysis API Endpoint
 *
 * Single endpoint for all AI analysis requests.
 * Routes to appropriate service based on context.
 * 
 * OWASP Security: Rate limited to prevent API cost abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnifiedAIService, type AnalysisContext } from '@/lib/services/ai/UnifiedAIService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { rateLimiter, checkAIUserRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - OWASP best practice: limit expensive AI operations
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       request.headers.get('x-real-ip') ||
                       'anonymous';

    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `ai-analyze:${identifier}`,
      windowMs: 60000, // 1 minute
      maxRequests: 5, // 5 requests per minute (very expensive AI analysis)
    });

    if (!rateLimitResult.allowed) {
      logger.warn('AI analyze rate limit exceeded', {
        service: 'ai_analyze',
        identifier,
        remaining: rateLimitResult.remaining,
        retryAfter: rateLimitResult.retryAfter,
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await serverSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Per-user rate limit: prevent a single user from exhausting AI budget
    const userRateLimit = await checkAIUserRateLimit(user.id);
    if (!userRateLimit.allowed) {
      logger.warn('AI analyze per-user rate limit exceeded', {
        service: 'ai_analyze',
        userId: user.id,
        remaining: userRateLimit.remaining,
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

    // Parse request body
    const body = await request.json();
    const { images, context } = body;

    // Validate input
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Images are required' },
        { status: 400 }
      );
    }

    if (!context || typeof context !== 'object') {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    // Add user ID to context
    const analysisContext: AnalysisContext = {
      ...context,
      userId: user.id,
    };

    // Log request
    logger.info('Unified AI analysis requested', {
      userId: user.id,
      type: analysisContext.type,
      imageCount: images.length,
    });

    // Perform analysis
    const result = await UnifiedAIService.analyzeImage(images, analysisContext);

    // Log result
    logger.info('Unified AI analysis completed', {
      userId: user.id,
      success: result.success,
      service: result.service,
      fallbackUsed: result.fallbackUsed,
      cost: result.cost,
      processingTime: result.processingTime,
    });

    // Return appropriate response
    if (!result.success) {
      // Handle specific error codes
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

      // Generic error
      return NextResponse.json(
        {
          error: 'Analysis failed',
          message: result.error?.message || 'Unknown error',
          fallbackUsed: result.fallbackUsed,
        },
        { status: 500 }
      );
    }

    // Success response
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

  } catch (error) {
    logger.error('Unified AI analysis endpoint error', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check AI service status
 */
export async function GET(request: NextRequest) {
  try {
    // Get service status
    const status = await UnifiedAIService.getStatus();

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Failed to get AI service status', error);

    return NextResponse.json(
      {
        operational: false,
        error: 'Failed to retrieve status',
      },
      { status: 500 }
    );
  }
}
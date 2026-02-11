import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { memoryManager } from '@/lib/services/ml-engine/memory/MemoryManager';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rate-limiter';

const consolidateSchema = z.object({
  level: z.number().int().min(0).max(10).optional(),
});

/**
 * POST /api/ml/memory/[agentName]/consolidate
 * Trigger memory consolidation for agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);
    const { agentName } = await params;
    const body = await request.json();
    const parsed = consolidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'level must be an integer 0-10 if provided' },
        { status: 400 }
      );
    }
    const { level } = parsed.data;

    if (level !== undefined) {
      // Consolidate specific level
      const result = await memoryManager.updateMemoryLevel(agentName, level);
      return NextResponse.json({ success: true, result });
    } else {
      // Consolidate all levels
      const levels = memoryManager.getMemoryLevels(agentName);
      const results = [];

      for (const memoryLevel of levels) {
        try {
          const result = await memoryManager.updateMemoryLevel(agentName, memoryLevel.level);
          results.push(result);
        } catch (error) {
          logger.warn('Failed to consolidate memory level', {
            service: 'MemoryAPI',
            agentName,
            level: memoryLevel.level,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return NextResponse.json({
        success: true,
        consolidated: results.length,
        results,
      });
    }
  } catch (error) {
    logger.error('Error consolidating memory', error, {
      service: 'MemoryAPI',
      // We can't easily access agentName here if await params failed, but it's unlikely.
      // We'll try to get it from the URL or just omit it.
      agentName: 'unknown',
    });
    return NextResponse.json(
      { error: 'Failed to consolidate memory' },
      { status: 500 }
    );
  }
}

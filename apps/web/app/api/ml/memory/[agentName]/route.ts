import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { memoryManager } from '@/lib/services/ml-engine/memory/MemoryManager';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rate-limiter';

const memoryUpdateSchema = z.object({
  level: z.number().int().min(0).max(10).optional(),
  keys: z.array(z.string().min(1).max(200)).optional(),
  values: z.array(z.unknown()).optional(),
}).refine(
  data => (data.keys !== undefined && data.values !== undefined) || data.level !== undefined,
  { message: 'Provide keys/values or level' }
);

/**
 * GET /api/ml/memory/[agentName]
 * Query memory state for agent
 */
export async function GET(
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

    const { agentName } = await params;
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') ? parseInt(searchParams.get('level')!) : undefined;

    const levels = memoryManager.getMemoryLevels(agentName);

    if (level !== undefined) {
      const targetLevel = levels.find(l => l.level === level);
      if (!targetLevel) {
        return NextResponse.json(
          { error: `Memory level ${level} not found for agent ${agentName}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ level: targetLevel });
    }

    return NextResponse.json({ levels });
  } catch (error) {
    logger.error('Error querying memory state', error, {
      service: 'MemoryAPI',
      agentName: 'unknown',
    });
    return NextResponse.json(
      { error: 'Failed to query memory state' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ml/memory/[agentName]
 * Trigger memory update for agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  // CSRF protection
  await requireCSRF(request);
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

    const { agentName } = await params;
    const body = await request.json();
    const parsed = memoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: provide keys/values or level (integer 0-10)' },
        { status: 400 }
      );
    }
    const { level, keys, values } = parsed.data;

    if (keys && values) {
      // Add context flow
      await memoryManager.addContextFlow(agentName, keys.map(Number), (values as number[]), level);
      return NextResponse.json({ success: true, message: 'Context flow added' });
    } else if (level !== undefined) {
      // Trigger memory update
      const result = await memoryManager.updateMemoryLevel(agentName, level);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { error: 'Invalid request: provide keys/values or level' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Error updating memory', error, {
      service: 'MemoryAPI',
      agentName: 'unknown',
    });
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}


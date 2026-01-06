import { NextRequest, NextResponse } from 'next/server';
import { memoryManager } from '@/lib/services/ml-engine/memory/MemoryManager';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * GET /api/ml/memory/[agentName]/levels
 * Get all memory levels for agent
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
    const levels = memoryManager.getMemoryLevels(agentName);

    return NextResponse.json({ levels });
  } catch (error) {
    logger.error('Error getting memory levels', error, {
      service: 'MemoryAPI',
      agentName: 'unknown',
    });
    return NextResponse.json(
      { error: 'Failed to get memory levels' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { SkillsVerificationService } from '@/lib/services/verification/SkillsVerificationService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const submitTestSchema = z.object({
  skillId: z.string().uuid(),
  answers: z.record(z.string(), z.number()),
});

export async function POST(request: NextRequest) {
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

    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can submit skills tests');
    }

    const validation = await validateRequest(request, submitTestSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { skillId, answers } = validation.data;

    const result = await SkillsVerificationService.submitTestResults(user.id, skillId, answers);

    if (!result.passed && result.error) {
      throw new BadRequestError(result.error);
    }

    return NextResponse.json({
      passed: result.passed,
      score: result.score,
      message: result.passed ? 'Skills test passed!' : `Test score: ${result.score}% (minimum 70% required)`,
    });
  } catch (error) {
    logger.error('Error submitting skills test', error, { service: 'contractor' });
    throw new InternalServerError('Internal server error');
  }
}


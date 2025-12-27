import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { SkillsVerificationService } from '@/lib/services/verification/SkillsVerificationService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';

const submitTestSchema = z.object({
  skillId: z.string().uuid(),
  answers: z.record(z.string(), z.number()),
});

export async function POST(request: NextRequest) {
  try {
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


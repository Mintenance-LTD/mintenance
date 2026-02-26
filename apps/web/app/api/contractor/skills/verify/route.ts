import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { SkillsVerificationService } from '@/lib/services/verification/SkillsVerificationService';
import { BadRequestError } from '@/lib/errors/api-error';

const submitTestSchema = z.object({
  skillId: z.string().uuid(),
  answers: z.record(z.string(), z.number()),
});

export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
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
      message: result.passed
        ? 'Skills test passed!'
        : `Test score: ${result.score}% (minimum 70% required)`,
    });
  }
);

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { SkillsVerificationService } from '@/lib/services/verification/SkillsVerificationService';
import { logger } from '@mintenance/shared';

const submitTestSchema = z.object({
  skillId: z.string().uuid(),
  answers: z.record(z.string(), z.number()),
});

export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can submit skills tests' }, { status: 403 });
    }

    const validation = await validateRequest(request, submitTestSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { skillId, answers } = validation.data;

    const result = await SkillsVerificationService.submitTestResults(user.id, skillId, answers);

    if (!result.passed && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      passed: result.passed,
      score: result.score,
      message: result.passed ? 'Skills test passed!' : `Test score: ${result.score}% (minimum 70% required)`,
    });
  } catch (error) {
    logger.error('Error submitting skills test', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


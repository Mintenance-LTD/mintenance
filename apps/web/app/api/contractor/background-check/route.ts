import { NextResponse } from 'next/server';
import { BackgroundCheckService } from '@/lib/services/verification/BackgroundCheckService';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const initiateCheckSchema = z.object({
  provider: z.enum(['checkr', 'goodhire', 'sterling', 'custom']).optional().default('checkr'),
});

/**
 * POST /api/contractor/background-check - initiate a background check.
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    const validation = await validateRequest(request, initiateCheckSchema);
    if ('headers' in validation) return validation;

    const { provider } = validation.data;
    const result = await BackgroundCheckService.initiateCheck(user.id, provider);

    if (!result.success) {
      throw new BadRequestError(result.error || 'Failed to initiate background check');
    }

    return NextResponse.json({
      message: 'Background check initiated successfully',
      checkId: result.checkId,
    });
  },
);

/**
 * GET /api/contractor/background-check - get background check status.
 */
export const GET = withApiHandler({}, async (_request, { user }) => {
  const status = await BackgroundCheckService.getCheckStatus(user.id);

  if (!status) {
    throw new NotFoundError('Background check status not found');
  }

  return NextResponse.json(status);
});

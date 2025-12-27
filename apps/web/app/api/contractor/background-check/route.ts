import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { BackgroundCheckService } from '@/lib/services/verification/BackgroundCheckService';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, BadRequestError, NotFoundError } from '@/lib/errors/api-error';

const initiateCheckSchema = z.object({
  provider: z.enum(['checkr', 'goodhire', 'sterling', 'custom']).optional().default('checkr'),
});

export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can initiate background checks');
    }

    const validation = await validateRequest(request, initiateCheckSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { provider } = validation.data;

    const result = await BackgroundCheckService.initiateCheck(user.id, provider);

    if (!result.success) {
      throw new BadRequestError(result.error || 'Failed to initiate background check');
    }

    return NextResponse.json({
      message: 'Background check initiated successfully',
      checkId: result.checkId,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const status = await BackgroundCheckService.getCheckStatus(user.id);

    if (!status) {
      throw new NotFoundError('Background check status not found');
    }

    return NextResponse.json(status);
  } catch (error) {
    return handleAPIError(error);
  }
}


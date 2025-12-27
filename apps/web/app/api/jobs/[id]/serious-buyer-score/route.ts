import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SeriousBuyerService } from '@/lib/services/jobs/SeriousBuyerService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view buyer score');
    }

    const { id: jobId } = await params;

    // Only contractors can view serious buyer score
    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can view serious buyer score');
    }

    const breakdown = await SeriousBuyerService.getScoreBreakdown(jobId);

    if (!breakdown) {
      throw new NotFoundError('Job not found');
    }

    return NextResponse.json(breakdown);
  } catch (error) {
    return handleAPIError(error);
  }
}


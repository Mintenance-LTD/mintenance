import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { SeriousBuyerService } from '@/lib/services/jobs/SeriousBuyerService';
import { NotFoundError } from '@/lib/errors/api-error';

export const GET = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { params }) => {
    const breakdown = await SeriousBuyerService.getScoreBreakdown(params.id);

    if (!breakdown) {
      throw new NotFoundError('Job not found');
    }

    return NextResponse.json(breakdown);
  }
);

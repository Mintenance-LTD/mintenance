import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SeriousBuyerService } from '@/lib/services/jobs/SeriousBuyerService';
import { logger } from '@mintenance/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // Only contractors can view serious buyer score
    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const breakdown = await SeriousBuyerService.getScoreBreakdown(jobId);

    if (!breakdown) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(breakdown);
  } catch (error) {
    logger.error('Error fetching serious buyer score', error, {
      service: 'jobs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


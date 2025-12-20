import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { MatchCommunicationService } from '@/lib/services/matching/MatchCommunicationService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { contractorId } = body;

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor ID is required' }, { status: 400 });
    }

    // Get match explanation
    const explanation = await MatchCommunicationService.getMatchExplanation(jobId, contractorId);

    if (!explanation) {
      return NextResponse.json({ error: 'Match explanation not found' }, { status: 404 });
    }

    // Send match notification
    const success = await MatchCommunicationService.notifyContractorOfMatch(
      jobId,
      contractorId,
      user.id,
      explanation
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to send match notification' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Match notification sent successfully',
      explanation,
    });
  } catch (error) {
    logger.error('Error sending match communication', error, {
      service: 'jobs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


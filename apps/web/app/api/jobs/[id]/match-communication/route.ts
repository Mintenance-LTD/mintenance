import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { MatchCommunicationService } from '@/lib/services/matching/MatchCommunicationService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/errors/api-error';

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required for match communication');
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { contractorId } = body;

    if (!contractorId) {
      throw new BadRequestError('Contractor ID is required');
    }

    // Get match explanation
    const explanation = await MatchCommunicationService.getMatchExplanation(jobId, contractorId);

    if (!explanation) {
      throw new NotFoundError('Match explanation not found');
    }

    // Send match notification
    const success = await MatchCommunicationService.notifyContractorOfMatch(
      jobId,
      contractorId,
      user.id,
      explanation
    );

    if (!success) {
      throw new Error('Failed to send match notification');
    }

    return NextResponse.json({
      message: 'Match notification sent successfully',
      explanation,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}


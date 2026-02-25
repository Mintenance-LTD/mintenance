import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { MatchCommunicationService } from '@/lib/services/matching/MatchCommunicationService';
import { validateRequest } from '@/lib/validation/validator';
import { matchCommunicationSchema } from '@/lib/validation/schemas';
import { NotFoundError } from '@/lib/errors/api-error';

export const POST = withApiHandler({}, async (request, { user, params }) => {
  const validation = await validateRequest(request, matchCommunicationSchema);
  if ('headers' in validation) {
    return validation;
  }

  const { contractorId } = validation.data;

  const explanation = await MatchCommunicationService.getMatchExplanation(params.id, contractorId);

  if (!explanation) {
    throw new NotFoundError('Match explanation not found');
  }

  const success = await MatchCommunicationService.notifyContractorOfMatch(
    params.id,
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
});

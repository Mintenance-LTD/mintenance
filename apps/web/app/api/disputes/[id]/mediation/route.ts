import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { MediationService } from '@/lib/services/disputes/MediationService';
import { ForbiddenError, BadRequestError } from '@/lib/errors/api-error';

const requestMediationSchema = z.object({
  action: z.enum(['request', 'schedule', 'complete']),
  scheduledAt: z.string().optional(),
  mediatorId: z.string().uuid().optional(),
  outcome: z.string().optional(),
});

export const POST = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const { id: disputeId } = params as { id: string };

  const validation = await validateRequest(request, requestMediationSchema);
  if ('headers' in validation) return validation;

  const { action, scheduledAt, mediatorId, outcome } = validation.data;

  if (action === 'request') {
    const success = await MediationService.requestMediation(disputeId, user.id);
    if (!success) {
      throw new BadRequestError('Failed to request mediation');
    }
    return NextResponse.json({ message: 'Mediation requested successfully' });
  }

  if (action === 'schedule' && scheduledAt && mediatorId) {
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only admins can schedule mediation');
    }
    const success = await MediationService.scheduleMediation(disputeId, new Date(scheduledAt), mediatorId);
    if (!success) {
      throw new BadRequestError('Failed to schedule mediation');
    }
    return NextResponse.json({ message: 'Mediation scheduled successfully' });
  }

  if (action === 'complete' && outcome) {
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only admins can complete mediation');
    }
    const success = await MediationService.recordOutcome(disputeId, outcome);
    if (!success) {
      throw new BadRequestError('Failed to record mediation outcome');
    }
    return NextResponse.json({ message: 'Mediation outcome recorded successfully' });
  }

  throw new BadRequestError('Invalid action or missing parameters');
});

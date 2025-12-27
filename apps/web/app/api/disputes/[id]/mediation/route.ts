import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { MediationService } from '@/lib/services/disputes/MediationService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';

const requestMediationSchema = z.object({
  action: z.enum(['request', 'schedule', 'complete']),
  scheduledAt: z.string().optional(),
  mediatorId: z.string().uuid().optional(),
  outcome: z.string().optional(),
});

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id: disputeId } = await params;
    const validation = await validateRequest(request, requestMediationSchema);
    if ('headers' in validation) {
      return validation;
    }

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
  } catch (error) {
    logger.error('Error handling mediation', error, { service: 'disputes' });
    throw new InternalServerError('Internal server error');
  }
}


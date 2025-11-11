import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { MediationService } from '@/lib/services/disputes/MediationService';
import { logger } from '@mintenance/shared';

const requestMediationSchema = z.object({
  action: z.enum(['request', 'schedule', 'complete']),
  scheduledAt: z.string().optional(),
  mediatorId: z.string().uuid().optional(),
  outcome: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { 
  // CSRF protection
  await requireCSRF(request);
params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        return NextResponse.json({ error: 'Failed to request mediation' }, { status: 400 });
      }
      return NextResponse.json({ message: 'Mediation requested successfully' });
    }

    if (action === 'schedule' && scheduledAt && mediatorId) {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can schedule mediation' }, { status: 403 });
      }
      const success = await MediationService.scheduleMediation(disputeId, new Date(scheduledAt), mediatorId);
      if (!success) {
        return NextResponse.json({ error: 'Failed to schedule mediation' }, { status: 400 });
      }
      return NextResponse.json({ message: 'Mediation scheduled successfully' });
    }

    if (action === 'complete' && outcome) {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can complete mediation' }, { status: 403 });
      }
      const success = await MediationService.recordOutcome(disputeId, outcome);
      if (!success) {
        return NextResponse.json({ error: 'Failed to record mediation outcome' }, { status: 400 });
      }
      return NextResponse.json({ message: 'Mediation outcome recorded successfully' });
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (error) {
    logger.error('Error handling mediation', error, { service: 'disputes' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


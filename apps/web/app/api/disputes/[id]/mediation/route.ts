import { mediationActionSchema } from '@/lib/disputes/mediation-contract';
import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { MediationService } from '@/lib/services/disputes/MediationService';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { hasValidStepUp } from '@/lib/auth/mfa-step-up';
import { isValidUUID } from '@/lib/validation/uuid';

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const disputeId = params.id as string;
    if (!isValidUUID(disputeId))
      throw new BadRequestError('Invalid dispute ID');
    const validation = await validateRequest(request, mediationActionSchema);
    if ('headers' in validation) return validation;
    if (validation.data.action !== 'request') {
      if (user.role !== 'admin')
        throw new ForbiddenError(
          'Only administrators can schedule or complete mediation.'
        );
      await requireAdminFromDatabase(user.id);
      if (!hasValidStepUp(request, user.id, 15))
        return NextResponse.json(
          {
            error: 'Step-up MFA required',
            requiresStepUp: true,
            maxAgeMinutes: 15,
          },
          { status: 403 }
        );
    }
    const mediation = await MediationService.transition(
      disputeId,
      user.id,
      validation.data
    );
    return NextResponse.json({ success: true, mediation });
  }
);

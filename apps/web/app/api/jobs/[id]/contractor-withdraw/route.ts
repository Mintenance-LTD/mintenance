import { withApiHandler } from '@/lib/api/with-api-handler';
import { performJobExit } from '@/lib/services/payment/JobExitService';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const exitSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Please provide a reason (at least 10 characters)')
    .max(1000),
});

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    const validation = await validateRequest(request, exitSchema);
    if ('headers' in validation) return validation;
    return performJobExit({
      actorId: user.id,
      jobId: params.id as string,
      kind: 'withdraw',
      reason: validation.data.reason,
      requestKey: request.headers.get('Idempotency-Key'),
    });
  }
);

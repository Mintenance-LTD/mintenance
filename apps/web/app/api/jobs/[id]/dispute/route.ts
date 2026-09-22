import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseOnError,
} from '@/lib/idempotency';

const disputeSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(20, 'Please describe the dispute in detail (at least 20 characters)')
      .max(2000),
    category: z.enum([
      'quality',
      'incomplete',
      'damage',
      'different_from_agreed',
      'other',
    ]),
  })
  .strict();
const resultSchema = z
  .array(
    z.object({
      dispute_id: z.string().uuid(),
      job_id: z.string().uuid(),
      escrow_id: z.string().uuid(),
    })
  )
  .length(1);
// Separate old cached responses, which did not establish a payment hold.
const operation = 'job_dispute_atomic';

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;
    const validation = await validateRequest(request, disputeSchema);
    if ('headers' in validation) return validation;
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, payer_user_id')
      .eq('id', jobId)
      .single();
    if (jobError && jobError.code !== 'PGRST116')
      throw new InternalServerError(
        'Unable to check job access. Please retry.'
      );
    if (!job) throw new NotFoundError('Job not found');
    if (job.homeowner_id !== user.id && job.payer_user_id !== user.id) {
      throw new ForbiddenError(
        'Only the homeowner or designated payer can file a dispute'
      );
    }
    const key = getIdempotencyKeyFromRequest(
      request,
      operation,
      user.id,
      jobId
    );
    const claim = await checkIdempotency(key, operation, true, {
      userId: user.id,
      request: { jobId, ...validation.data },
    });
    if (claim?.isDuplicate && claim.cachedResult)
      return NextResponse.json(claim.cachedResult);
    return releaseOnError(
      key,
      operation,
      async () => {
        const { data, error } = await serverSupabase.rpc(
          'create_customer_job_dispute',
          {
            p_job_id: jobId,
            p_actor_id: user.id,
            p_reason: validation.data.reason,
            p_category: validation.data.category,
          }
        );
        if (error?.code === '42501')
          throw new ForbiddenError('Your access to this job has changed.');
        if (error?.code === 'P0002') throw new NotFoundError('Job not found');
        if (error?.code === '23514')
          throw new ConflictError(
            'This job does not have a single payment available for this dispute. Refresh the job or contact support.'
          );
        if (error)
          throw new InternalServerError(
            'Unable to file the dispute. Please retry.'
          );
        const parsed = resultSchema.safeParse(data);
        if (!parsed.success || parsed.data[0].job_id !== jobId) {
          throw new InternalServerError(
            'Dispute confirmation was incomplete. Retry to check the same request.'
          );
        }
        const result = parsed.data[0];
        const response = {
          success: true,
          disputeId: result.escrow_id,
          disputeRecordId: result.dispute_id,
          escrowId: result.escrow_id,
          message:
            'Dispute filed. Payment release is paused while it is reviewed.',
        };
        await storeIdempotencyResult(
          key,
          operation,
          response,
          user.id,
          { jobId, disputeId: result.dispute_id },
          claim?.ownership
        );
        return NextResponse.json(response);
      },
      claim?.ownership
    );
  }
);

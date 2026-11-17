import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    const input = z
      .object({
        reworkRequestId: z.string().uuid(),
        reopenForEvidence: z.literal(true),
      })
      .strict()
      .safeParse(await request.json().catch(() => null));
    if (!input.success || !z.string().uuid().safeParse(params.id).success)
      throw new BadRequestError(
        'Confirm the exact rework cycle to reopen for evidence.'
      );
    const result = await serverSupabase.rpc('recover_legacy_rework', {
      p_actor: user.id,
      p_job: params.id,
      p_rework: input.data.reworkRequestId,
    });
    if (result.error?.code === '42501')
      throw new ForbiddenError('Job unavailable');
    if (['23514', '40001'].includes(result.error?.code ?? ''))
      throw new ConflictError(
        'Recovery is unavailable. Reload the job; an approved payment, active dispute or newer rework cycle needs separate review.'
      );
    if (result.error || typeof result.data !== 'boolean')
      throw new InternalServerError(
        'Recovery was not confirmed. Reload before retrying.'
      );
    return NextResponse.json({
      success: true,
      jobId: params.id,
      recovered: result.data,
    });
  }
);

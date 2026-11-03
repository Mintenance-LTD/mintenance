import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';
const schema = z
  .object({
    message: z.string().trim().min(1).max(5000),
    requestId: z.string().uuid(),
  })
  .strict();
export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (req, { user, params }) => {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success || !z.string().uuid().safeParse(params.id).success)
      throw new BadRequestError(
        'Enter a cancellation message and valid reference'
      );
    const { data, error } = await serverSupabase.rpc(
      'request_contract_cancellation',
      {
        p_contract: params.id,
        p_customer: user.id,
        p_message: parsed.data.message,
        p_request: parsed.data.requestId,
      }
    );
    if (error?.code === '42501') throw new NotFoundError('Contract not found');
    if (error)
      throw new InternalServerError(
        'Could not record cancellation. You can also notify the contractor and email admin@mintenance.co.uk.'
      );
    return NextResponse.json({
      ticketId: data,
      message:
        'Cancellation notice recorded. Payment adjustments will be reviewed separately.',
    });
  }
);

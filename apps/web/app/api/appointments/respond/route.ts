import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
const schema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  response: z.enum(['confirmed', 'change_requested']),
});
export const POST = withApiHandler({}, async (request, { user }) => {
  const input = schema.safeParse(await request.json());
  if (!input.success) throw new BadRequestError('Invalid visit response');
  const v = input.data;
  const { error } = await serverSupabase.rpc('respond_to_visit', {
    p_actor: user.id,
    p_id: v.id,
    p_date: v.date,
    p_start: v.start,
    p_end: v.end,
    p_response: v.response,
  });
  if (error?.code === '42501') throw new ForbiddenError('Visit unavailable');
  if (error?.code === '40001')
    return NextResponse.json(
      { error: 'Visit changed. Refresh before confirming.' },
      { status: 409 }
    );
  if (error) throw error;
  return NextResponse.json({ success: true });
});

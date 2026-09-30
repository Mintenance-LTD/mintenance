import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError } from '@/lib/errors/api-error';

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (request, { user }) => {
    const query = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!query.success) throw new BadRequestError('Invalid queue pagination');
    const { data, error } = await serverSupabase.rpc('portfolio_action_queue', {
      p_user_id: user.id,
      p_offset: query.data.offset,
      p_limit: query.data.limit,
    });
    if (error) throw error;
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
);

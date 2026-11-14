import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError } from '@/lib/errors/api-error';

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  property: z.uuid().optional(),
  priority: z.coerce.number().int().min(0).max(2).optional(),
  person: z.string().trim().max(100).default(''),
  sort: z.enum(['priority', 'due', 'property', 'person']).default('priority'),
  scope: z.enum(['team', 'mine', 'unassigned']).default('team'),
});
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (request, { user }) => {
    const query = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!query.success) throw new BadRequestError('Invalid queue pagination');
    const { data, error } = await serverSupabase.rpc(
      'portfolio_filtered_action_queue',
      {
        p_user_id: user.id,
        p_offset: query.data.offset,
        p_limit: query.data.limit,
        p_scope: query.data.scope,
        p_property: query.data.property ?? null,
        p_priority: query.data.priority ?? null,
        p_person: query.data.person,
        p_sort: query.data.sort,
      }
    );
    if (error) throw error;
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
);

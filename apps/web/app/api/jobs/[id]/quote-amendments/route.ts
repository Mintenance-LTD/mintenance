import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { amendmentError } from '@/lib/quotes/amendment-api';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (request, { user, params }) => {
    const cursor = new URL(request.url).searchParams.get('before');
    if (
      cursor !== null &&
      (!/^\d+$/.test(cursor) ||
        !Number.isSafeInteger(Number(cursor)) ||
        Number(cursor) < 1)
    )
      throw new BadRequestError('Invalid history cursor.');
    const { data, error } = await serverSupabase.rpc(
      'read_job_quote_amendments',
      {
        p_job: params.id,
        p_actor: user.id,
        p_before: cursor ? Number(cursor) : null,
      }
    );
    amendmentError(error);
    if (!data || !Array.isArray(data.amendments))
      throw new InternalServerError('Could not read amendments.');
    const amendments = data.amendments.slice(0, 50);
    return NextResponse.json(
      {
        ...data,
        can_approve: data.can_approve === true,
        is_contractor: data.is_contractor === true,
        amendments,
        next_before:
          data.amendments.length > 50 ? amendments[49].sequence : null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
);

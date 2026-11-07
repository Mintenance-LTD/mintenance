import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError, NotFoundError } from '@/lib/errors/api-error';

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 60 } },
  async (_request, { user, params }) => {
    const { data: quote, error } = await serverSupabase
      .from('contractor_quotes')
      .select('id,title,job_id,status,updated_at,total_amount,line_items,terms')
      .eq('id', params.id)
      .eq('contractor_id', user.id)
      .maybeSingle();
    if (error)
      throw new InternalServerError('Could not load amendment source.');
    if (!quote) throw new NotFoundError('Quote not found.');
    const { data: current, error: currentError } = await serverSupabase
      .from('current_contractor_quotes')
      .select('id')
      .eq('id', params.id)
      .eq('contractor_id', user.id)
      .maybeSingle();
    if (currentError)
      throw new InternalServerError('Could not verify current quote.');
    return NextResponse.json(
      { quote, is_current: Boolean(current) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
);

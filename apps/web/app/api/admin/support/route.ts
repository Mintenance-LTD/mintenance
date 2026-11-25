import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { readSupportOperators } from '@/lib/services/support/readOperators';
import { InternalServerError } from '@/lib/errors/api-error';
export const GET = withApiHandler(
  { roles: ['admin'], requireDbAdmin: true, csrf: false },
  async (req, { user }) => {
    const url = new URL(req.url);
    let q = db
      .from('support_tickets')
      .select('*')
      .order('response_due_at')
      .limit(100);
    if (url.searchParams.get('mine') === '1') q = q.eq('assigned_to', user.id);
    if (url.searchParams.get('closed') !== '1')
      q = q.in('status', ['open', 'in_progress']);
    const [{ data: tickets, error }, operators] = await Promise.all([q, readSupportOperators()]);
    if (error) throw new InternalServerError('Could not load support inbox');
    return NextResponse.json({ tickets, operators, currentAdminId: user.id });
  }
);

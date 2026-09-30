import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError } from '@/lib/errors/api-error';
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (request, { user }) => {
    const offset = Number(request.nextUrl.searchParams.get('offset') || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
      throw new BadRequestError('Invalid report page');
    const { data, error } = await serverSupabase.rpc(
      'portfolio_management_report',
      { p_user_id: user.id, p_offset: offset }
    );
    if (error) throw error;
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
);

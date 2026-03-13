/**
 * GET /api/contractor/team
 * Fetch contractor's team members (sub-contractors, employees)
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: members, error } = await serverSupabase
      .from('company_team_members')
      .select('id, name, role, phone, email, avatar_url, status')
      .eq('contractor_id', user.id)
      .order('name');

    if (error) {
      logger.error('Failed to fetch team members', error, {
        service: 'contractor-team',
        userId: user.id,
      });
      throw new InternalServerError('Failed to fetch team members');
    }

    return NextResponse.json({ members: members || [] });
  }
);

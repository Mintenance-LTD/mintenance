import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
import {
  supportCaseSchema,
  parseInput,
  createCase,
} from '@/lib/services/support/SupportService';
export const GET = withApiHandler(
  { roles: ['homeowner', 'contractor'], csrf: false },
  async (_req, { user }) => {
    const { data, error } = await db
      .from('support_tickets')
      .select('id,subject,status,priority,category,created_at,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw new InternalServerError('Could not load support requests');
    return NextResponse.json({ tickets: data });
  }
);
export const POST = withApiHandler(
  {
    roles: ['homeowner', 'contractor'],
    rateLimit: { maxRequests: 10, windowMs: 3600000 },
  },
  async (req, { user }) => {
    const id = await createCase(
      user.id,
      null,
      parseInput(supportCaseSchema, await req.json())
    );
    return NextResponse.json(
      {
        ticket: { id },
        message: 'Request received. Track replies in your support inbox.',
      },
      { status: 201 }
    );
  }
);

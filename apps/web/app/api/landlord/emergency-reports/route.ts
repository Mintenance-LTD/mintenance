import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Authenticated identity only; property ownership/assignment is checked inside
// the transaction. Being a platform admin does not bypass that check.
export const GET = withApiHandler({}, async (_req, { user }) => {
  const { data, error } = await serverSupabase.rpc('emergency_report_inbox', {
    p_actor: user.id,
  });
  if (error)
    return NextResponse.json(
      { error: 'Emergency inbox could not be loaded' },
      { status: 503 }
    );
  return NextResponse.json(
    { reports: data },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});

const acknowledgment = z.object({ report_id: z.string().uuid() }).strict();
export const PATCH = withApiHandler({}, async (req, { user }) => {
  const parsed = acknowledgment.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid report acknowledgment' },
      { status: 400 }
    );
  const { data, error } = await serverSupabase.rpc(
    'acknowledge_emergency_report',
    {
      p_actor: user.id,
      p_report: parsed.data.report_id,
    }
  );
  if (error) {
    const status =
      error.code === '42501' ? 403 : error.code === 'PT409' ? 409 : 503;
    return NextResponse.json(
      {
        error:
          status === 403
            ? 'Report access denied'
            : 'Acknowledgment could not be confirmed. Reload and try again.',
      },
      { status }
    );
  }
  return NextResponse.json({ incident: data });
});

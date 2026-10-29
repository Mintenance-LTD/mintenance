import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
} from '@/lib/errors/api-error';
export const GET = withApiHandler(
  { roles: ['admin'] },
  async (_request, { user }) => {
    await requireAdminFromDatabase(user.id);
    const { data, error } = await serverSupabase
      .from('push_dispatch_attempts')
      .select('id,status,created_at,device_count,reviewed_at,review_note')
      .in('status', ['needs_review', 'reviewed_unknown'])
      .order('status', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new InternalServerError('Push review could not be loaded');
    return NextResponse.json(
      { attempts: data ?? [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
);
export const POST = withApiHandler(
  { roles: ['admin'] },
  async (request, { user }) => {
    await requireAdminFromDatabase(user.id);
    const parsed = z
      .object({
        id: z.string().uuid(),
        note: z.string().trim().min(20).max(1000),
      })
      .strict()
      .safeParse(await request.json());
    if (!parsed.success)
      throw new BadRequestError(
        'Enter a review note of 20 to 1,000 characters.'
      );
    // Preserve uncertainty and an audit trail. This cannot send a push or mark delivery successful.
    const { data, error } = await serverSupabase
      .from('push_dispatch_attempts')
      .update({
        status: 'reviewed_unknown',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: parsed.data.note,
      })
      .eq('id', parsed.data.id)
      .eq('status', 'needs_review')
      .select('id,status')
      .maybeSingle();
    if (error) throw new InternalServerError('Review could not be saved');
    if (!data)
      throw new ConflictError('This attempt has changed. Reload the list.');
    return NextResponse.json({ attempt: data });
  }
);

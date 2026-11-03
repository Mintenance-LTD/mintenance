import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  parseInput,
  requireSupportPermission,
} from '@/lib/services/support/SupportService';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
const schema = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
    audience: z.enum(['all', 'homeowners', 'contractors', 'individual']),
    recipientEmail: z.string().email().max(254).optional(),
    channels: z
      .array(z.enum(['email', 'in_app', 'push']))
      .min(1)
      .max(3),
  })
  .strict();
export const GET = withApiHandler(
  { roles: ['admin'], requireDbAdmin: true, csrf: false },
  async () => {
    const { data, error } = await db
      .from('customer_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw new InternalServerError('Could not load communications');
    return NextResponse.json({ campaigns: data });
  }
);
export const POST = withApiHandler(
  {
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'communication_draft',
      category: 'communication',
      targetType: 'campaign',
    },
  },
  async (req, { user }) => {
    await requireSupportPermission(user.id, 'can_broadcast');
    const p = parseInput(schema, await req.json());
    if (p.audience === 'individual' && !p.recipientEmail)
      throw new BadRequestError('Enter the customer email');
    let q = db
      .from('profiles')
      .select('id')
      .is('deleted_at', null)
      .in('role', ['homeowner', 'contractor'])
      .limit(1001);
    if (p.audience === 'homeowners') q = q.eq('role', 'homeowner');
    if (p.audience === 'contractors') q = q.eq('role', 'contractor');
    if (p.audience === 'individual')
      q = q.eq('email', p.recipientEmail!.trim().toLowerCase());
    const { data: users, error } = await q;
    if (error) throw new InternalServerError('Could not preview recipients');
    if (!users?.length || users.length > 1000)
      throw new BadRequestError('Choose an audience of 1 to 1000 customers');
    const { data, error: saveError } = await db
      .from('customer_campaigns')
      .insert({
        created_by: user.id,
        title: p.title,
        body: p.body,
        audience: p.audience,
        recipient_ids: users.map((u) => u.id),
        channels: [...new Set(p.channels)],
      })
      .select('*')
      .single();
    if (saveError) throw new InternalServerError('Could not save draft');
    return NextResponse.json(
      {
        campaign: data,
        recipientCount: users.length,
        note: 'Only active accounts with verified email are included when you send.',
      },
      { status: 201 }
    );
  }
);

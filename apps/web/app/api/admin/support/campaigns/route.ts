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
    const { data: users, error } = await db.rpc('preview_customer_campaign_recipients', {
      p_actor: user.id, p_audience: p.audience, p_email: p.recipientEmail ?? null,
    }) as { data: { id: string }[] | null; error: unknown };
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
    const effectiveChannels = data.channels as string[];
    const channelCounts = Object.fromEntries(effectiveChannels
      .filter((channel) => channel !== 'in_app' || !effectiveChannels.includes('push'))
      .map((channel) => [channel, users.length]));
    return NextResponse.json(
      {
        campaign: { ...data, recipient_ids: undefined },
        channelCounts,
        recipientCount: users.length,
        note: 'Eligibility is checked again when you send.'
      },
      { status: 201 }
    );
  }
);

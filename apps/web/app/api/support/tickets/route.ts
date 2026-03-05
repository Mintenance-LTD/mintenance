import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { hasFeatureAccess } from '@/lib/feature-access-config';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
import { z } from 'zod';

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

/**
 * GET /api/support/tickets — list user's support tickets
 */
export const GET = withApiHandler(
  { roles: ['homeowner', 'contractor'], csrf: false },
  async (request, { user }) => {
    // Check agency tier for homeowners
    if (user.role === 'homeowner') {
      const { data: sub } = await serverSupabase
        .from('homeowner_subscriptions')
        .select('plan_type')
        .eq('homeowner_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!hasFeatureAccess('HOMEOWNER_DEDICATED_SUPPORT', 'homeowner', sub?.plan_type || 'free')) {
        throw new ForbiddenError('Dedicated support requires an Agency subscription');
      }
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const { data: tickets, error, count } = await serverSupabase
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({ tickets: tickets || [], total: count || 0 });
  },
);

/**
 * POST /api/support/tickets — create a support ticket
 */
export const POST = withApiHandler(
  { roles: ['homeowner', 'contractor'] },
  async (req, { user }) => {
    // Check agency tier
    if (user.role === 'homeowner') {
      const { data: sub } = await serverSupabase
        .from('homeowner_subscriptions')
        .select('plan_type')
        .eq('homeowner_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!hasFeatureAccess('HOMEOWNER_DEDICATED_SUPPORT', 'homeowner', sub?.plan_type || 'free')) {
        throw new ForbiddenError('Dedicated support requires an Agency subscription');
      }
    }

    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const { data: ticket, error } = await serverSupabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: parsed.data.subject,
        message: parsed.data.message,
        priority: parsed.data.priority,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ ticket }, { status: 201 });
  },
);

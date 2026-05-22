import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';
import { BadRequestError } from '@/lib/errors/api-error';
import { z } from 'zod';

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

/**
 * 2026-05-22 Sprint 3: SLA matrix. All tiers can open tickets; tier
 * controls the response-time commitment we make.
 * - Basic/Free contractors + Free homeowners: 48h email
 * - Pro contractors + Landlord homeowners: 24h priority
 * - Business contractors + Agency homeowners: 4h phone
 */
function slaForTier(
  tier: 'free' | 'basic' | 'professional' | 'enterprise' | 'landlord' | 'agency'
): { hours: number; ticketPriority: 'low' | 'normal' | 'high' } {
  switch (tier) {
    case 'enterprise':
    case 'agency':
      return { hours: 4, ticketPriority: 'high' };
    case 'professional':
    case 'landlord':
      return { hours: 24, ticketPriority: 'normal' };
    case 'free':
    case 'basic':
    default:
      return { hours: 48, ticketPriority: 'low' };
  }
}

async function resolveUserTier(
  userId: string,
  role: 'homeowner' | 'contractor'
): Promise<
  'free' | 'basic' | 'professional' | 'enterprise' | 'landlord' | 'agency'
> {
  if (role === 'homeowner') {
    const tier = await getEffectiveHomeownerTier(userId);
    return tier;
  }
  return FeeCalculationService.resolveContractorTier(userId);
}

/**
 * GET /api/support/tickets — list user's support tickets
 */
export const GET = withApiHandler(
  { roles: ['homeowner', 'contractor'], csrf: false },
  async (request, { user }) => {
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '20', 10),
      100
    );
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const {
      data: tickets,
      error,
      count,
    } = await serverSupabase
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({ tickets: tickets || [], total: count || 0 });
  }
);

/**
 * POST /api/support/tickets — create a support ticket.
 * SLA is set by the user's effective subscription tier.
 */
export const POST = withApiHandler(
  { roles: ['homeowner', 'contractor'] },
  async (req, { user }) => {
    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message || 'Invalid input'
      );
    }

    const tier = await resolveUserTier(
      user.id,
      user.role as 'homeowner' | 'contractor'
    );
    const sla = slaForTier(tier);

    // The user's `priority` value indicates how urgent THEY think their
    // issue is. We don't override it — instead the tier-derived
    // ticketPriority is a *floor* (e.g. a Pro contractor's tickets are
    // never less than 'normal' even if they pick 'low').
    const PRIORITY_RANK: Record<string, number> = {
      low: 0,
      normal: 1,
      high: 2,
      urgent: 3,
    };
    const userRank = PRIORITY_RANK[parsed.data.priority] ?? 1;
    const tierRank = PRIORITY_RANK[sla.ticketPriority] ?? 0;
    const effectivePriority =
      userRank >= tierRank ? parsed.data.priority : sla.ticketPriority;

    const { data: ticket, error } = await serverSupabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: parsed.data.subject,
        message: parsed.data.message,
        priority: effectivePriority,
        sla_hours: sla.hours,
        sla_tier: tier,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ ticket }, { status: 201 });
  }
);

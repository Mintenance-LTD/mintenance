import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';
import { handleAPIError, UnauthorizedError, BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const listQuerySchema = z.object({
  orgId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  status: z.enum(['open', 'triaged', 'in_progress', 'blocked', 'resolved', 'closed']).optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
});

const createTicketSchema = z.object({
  orgId: z.string().uuid(),
  propertyId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  category: z.string().max(100).default('general'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  slaDueAt: z.string().datetime().optional(),
});

async function requireActiveMembership(orgId: string, userId: string): Promise<void> {
  const { data, error } = await serverSupabase
    .from('organization_memberships')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new ForbiddenError('You are not an active member of this organization');
  }
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(30),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const blocked = await requirePortfolioModeSubscription(request);
    if (blocked) {
      return blocked;
    }

    const parsed = listQuerySchema.safeParse({
      orgId: request.nextUrl.searchParams.get('orgId') || undefined,
      propertyId: request.nextUrl.searchParams.get('propertyId') || undefined,
      status: request.nextUrl.searchParams.get('status') || undefined,
      limit: request.nextUrl.searchParams.get('limit') || undefined,
    });

    if (!parsed.success) {
      throw new BadRequestError('Invalid query parameters');
    }

    let orgId = parsed.data.orgId;
    if (!orgId) {
      const { data: membership, error: membershipError } = await serverSupabase
        .from('organization_memberships')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership?.org_id) {
        return NextResponse.json({
          feature: 'portfolio_mode',
          tickets: [],
        });
      }

      orgId = membership.org_id;
    }

    const resolvedOrgId = orgId;
    if (!resolvedOrgId) {
      throw new BadRequestError('Organization context is required');
    }

    await requireActiveMembership(resolvedOrgId, user.id);

    let query = serverSupabase
      .from('maintenance_tickets')
      .select('id, org_id, property_id, unit_id, title, description, category, priority, status, assigned_to, reported_by, sla_due_at, resolved_at, created_at, updated_at')
      .eq('org_id', resolvedOrgId)
      .order('created_at', { ascending: false })
      .limit(parsed.data.limit);

    if (parsed.data.propertyId) {
      query = query.eq('property_id', parsed.data.propertyId);
    }
    if (parsed.data.status) {
      query = query.eq('status', parsed.data.status);
    }

    const { data: tickets, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json({
      feature: 'portfolio_mode',
      orgId: resolvedOrgId,
      tickets: tickets || [],
    });
  } catch (err) {
    return handleAPIError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(30),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const blocked = await requirePortfolioModeSubscription(request);
    if (blocked) {
      return blocked;
    }

    const body = await request.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid request body for ticket creation');
    }

    await requireActiveMembership(parsed.data.orgId, user.id);

    const { data: ticket, error } = await serverSupabase
      .from('maintenance_tickets')
      .insert({
        org_id: parsed.data.orgId,
        property_id: parsed.data.propertyId,
        unit_id: parsed.data.unitId || null,
        reported_by: user.id,
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        category: parsed.data.category.trim().toLowerCase(),
        priority: parsed.data.priority,
        status: 'open',
        sla_due_at: parsed.data.slaDueAt || null,
      })
      .select('id, org_id, property_id, unit_id, title, description, category, priority, status, assigned_to, reported_by, sla_due_at, created_at, updated_at')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        feature: 'portfolio_mode',
        ticket,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleAPIError(err);
  }
}

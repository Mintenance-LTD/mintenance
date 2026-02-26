import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const updateTicketSchema = z.object({
  status: z.enum(['open', 'triaged', 'in_progress', 'blocked', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  resolutionNote: z.string().max(5000).optional(),
});

async function getMembershipRole(orgId: string, userId: string): Promise<string | null> {
  const { data, error } = await serverSupabase
    .from('organization_memberships')
    .select('org_role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.org_role ?? null;
}

function canManageTicket(role: string | null): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'manager' || role === 'maintenance_coordinator';
}

export const GET = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const blocked = await requirePortfolioModeSubscription(request);
  if (blocked) {
    return blocked;
  }

  const { id } = params;
  const { data: ticket, error } = await serverSupabase
    .from('maintenance_tickets')
    .select('id, org_id, property_id, unit_id, title, description, category, priority, status, assigned_to, reported_by, sla_due_at, resolved_at, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  const role = await getMembershipRole(ticket.org_id, user.id);
  if (!role && ticket.reported_by !== user.id && user.role !== 'admin') {
    throw new ForbiddenError('You do not have access to this ticket');
  }

  const { data: updates, error: updatesError } = await serverSupabase
    .from('ticket_updates')
    .select('id, ticket_id, author_id, update_type, body, visibility, created_at')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true });

  if (updatesError) {
    throw updatesError;
  }

  return NextResponse.json({
    feature: 'portfolio_mode',
    ticket,
    updates: updates || [],
  });
});

export const PATCH = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const blocked = await requirePortfolioModeSubscription(request);
  if (blocked) {
    return blocked;
  }

  const { id } = params;
  const body = await request.json();
  const parsed = updateTicketSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError('Invalid request body for ticket update');
  }

  const { data: existing, error: existingError } = await serverSupabase
    .from('maintenance_tickets')
    .select('id, org_id, reported_by, status')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }
  if (!existing) {
    throw new NotFoundError('Ticket not found');
  }

  const role = await getMembershipRole(existing.org_id, user.id);
  const isReporter = existing.reported_by === user.id;
  const isAdmin = user.role === 'admin';
  const canManage = canManageTicket(role) || isAdmin;

  if (!canManage && !isReporter) {
    throw new ForbiddenError('You do not have permission to update this ticket');
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status) {
    if (!canManage) {
      throw new ForbiddenError('Only organization managers can change ticket status');
    }
    updatePayload.status = parsed.data.status;
    if (parsed.data.status === 'resolved' || parsed.data.status === 'closed') {
      updatePayload.resolved_at = new Date().toISOString();
    }
  }

  if (parsed.data.priority) {
    if (!canManage) {
      throw new ForbiddenError('Only organization managers can change ticket priority');
    }
    updatePayload.priority = parsed.data.priority;
  }

  if (parsed.data.assignedTo !== undefined) {
    if (!canManage) {
      throw new ForbiddenError('Only organization managers can assign tickets');
    }
    updatePayload.assigned_to = parsed.data.assignedTo;
  }

  const { data: updated, error: updateError } = await serverSupabase
    .from('maintenance_tickets')
    .update(updatePayload)
    .eq('id', id)
    .select('id, org_id, property_id, unit_id, title, description, category, priority, status, assigned_to, reported_by, sla_due_at, resolved_at, created_at, updated_at')
    .single();

  if (updateError) {
    throw updateError;
  }

  if (parsed.data.status || parsed.data.priority || parsed.data.assignedTo !== undefined || parsed.data.resolutionNote) {
    const updateType =
      parsed.data.assignedTo !== undefined ? 'assignment'
        : parsed.data.status ? 'status_change'
          : parsed.data.resolutionNote ? 'resolution'
            : 'comment';

    const bodyText = parsed.data.resolutionNote
      ? parsed.data.resolutionNote
      : `Ticket updated by ${user.email}`;

    const { error: updateInsertError } = await serverSupabase
      .from('ticket_updates')
      .insert({
        ticket_id: id,
        author_id: user.id,
        update_type: updateType,
        body: bodyText,
        visibility: updateType === 'resolution' ? 'tenant_visible' : 'internal',
      });

    if (updateInsertError) {
      throw updateInsertError;
    }
  }

  return NextResponse.json({
    feature: 'portfolio_mode',
    ticket: updated,
  });
});

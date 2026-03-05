import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError, ForbiddenError } from '@/lib/errors/api-error';

/**
 * GET /api/support/tickets/[id] — get a single ticket
 */
export const GET = withApiHandler(
  { roles: ['homeowner', 'contractor', 'admin'], csrf: false },
  async (_req, { user, params }) => {
    const { data: ticket, error } = await serverSupabase
      .from('support_tickets')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (ticket.user_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Not authorized');
    }

    return NextResponse.json({ ticket });
  },
);

/**
 * PATCH /api/support/tickets/[id] — update ticket status (admin or owner)
 */
export const PATCH = withApiHandler(
  { roles: ['homeowner', 'contractor', 'admin'] },
  async (req, { user, params }) => {
    const { data: ticket } = await serverSupabase
      .from('support_tickets')
      .select('id, user_id')
      .eq('id', params.id)
      .single();

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (ticket.user_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Not authorized');
    }

    const body = await req.json();
    const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data: updated, error } = await serverSupabase
      .from('support_tickets')
      .update({
        ...(body.status ? { status: body.status } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ ticket: updated });
  },
);

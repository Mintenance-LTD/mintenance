import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
export const GET = withApiHandler(
  { roles: ['admin'], requireDbAdmin: true, csrf: false },
  async (req, { user }) => {
    const url = new URL(req.url);
    let q = db
      .from('support_tickets')
      .select('*')
      .order('response_due_at')
      .limit(100);
    if (url.searchParams.get('mine') === '1') q = q.eq('assigned_to', user.id);
    if (url.searchParams.get('closed') !== '1')
      q = q.in('status', ['open', 'in_progress']);
    const [
      { data: tickets, error },
      { data: operators, error: opError },
      { data: deliveries, error: deliveryError },
    ] = await Promise.all([
      q,
      db
        .from('support_operator_settings')
        .select('admin_id,available,capacity,can_broadcast,can_manage_team'),
      db
        .from('customer_communication_outbox')
        .select(
          'id,event_key,channel,status,created_at,last_error,subject,recipient_email,provider_id,attempts'
        )
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    if (error || opError || deliveryError)
      throw new InternalServerError('Could not load support inbox');
    const { data: names, error: nameError } = await db
      .from('profiles')
      .select('id,first_name,last_name,email')
      .eq('role', 'admin')
      .is('deleted_at', null);
    if (nameError) throw new InternalServerError('Could not load operators');
    return NextResponse.json({
      tickets,
      operators: names?.map((p) => {
        const o = operators?.find((entry) => entry.admin_id === p.id) || {
          admin_id: p.id,
          available: false,
          capacity: 20,
          can_broadcast: false,
          can_manage_team: false,
        };
        return {
          ...o,
          name:
            [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
            p?.email ||
            'Operator',
        };
      }),
      deliveries,
      currentAdminId: user.id,
    });
  }
);

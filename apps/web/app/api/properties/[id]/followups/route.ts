import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
const source = z.object({
  kind: z.enum(['job', 'report', 'maintenance', 'certificate']),
  sourceId: z.string().uuid(),
});
const save = source.extend({
  revision: z.number().int().min(0),
  assignedTo: z.string().uuid().nullable(),
  dueAt: z.string().datetime().nullable(),
  waitingFor: z.enum(['manager', 'tenant', 'contractor', 'approval']),
  note: z.string().trim().max(5000),
});
const tables = {
  job: 'jobs',
  report: 'anonymous_reports',
  maintenance: 'recurring_schedules',
  certificate: 'compliance_certificates',
};
async function authorize(
  userId: string,
  propertyId: string,
  kind: keyof typeof tables,
  id: string
) {
  const access = await PropertyTeamService.authorize(
    userId,
    propertyId,
    'manage_maintenance'
  );
  if (!access.authorized || (kind === 'report' && access.role !== 'owner'))
    throw new ForbiddenError('You cannot manage this follow-up');
  const { data, error } = await serverSupabase
    .from(tables[kind])
    .select('id')
    .eq('id', id)
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new BadRequestError('Source does not belong to this property');
}
export const GET = withApiHandler({}, async (request, { user, params }) => {
  const parsed = source.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) throw new BadRequestError('Invalid source');
  const { kind, sourceId } = parsed.data;
  await authorize(user.id, params.id, kind, sourceId);
  const results = await Promise.all([
    serverSupabase
      .from('property_action_followups')
      .select('*')
      .eq('kind', kind)
      .eq('source_id', sourceId)
      .maybeSingle(),
    serverSupabase
      .from('property_action_updates')
      .select('id,body,created_at,delivery:notification_id(status,sent_at)')
      .eq('kind', kind)
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false })
      .limit(50),
    serverSupabase
      .from('properties')
      .select('owner_id')
      .eq('id', params.id)
      .single(),
    serverSupabase
      .from('property_team_members')
      .select('user_id')
      .eq('property_id', params.id)
      .eq('status', 'accepted')
      .in('role', ['admin', 'manager']),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const owner = results[2].data as { owner_id: string };
  const members = results[3].data as { user_id: string }[];
  const { data: people, error } = await serverSupabase
    .from('profiles')
    .select('id,first_name,last_name')
    .in('id', [owner.owner_id, ...members.map((row) => row.user_id)]);
  if (error) throw error;
  return NextResponse.json(
    { followup: results[0].data, updates: results[1].data, people },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
});
export const PATCH = withApiHandler({}, async (request, { user, params }) => {
  const parsed = save.safeParse(await request.json());
  if (!parsed.success) throw new BadRequestError('Invalid follow-up');
  const value = parsed.data;
  await authorize(user.id, params.id, value.kind, value.sourceId);
  const { data, error } = await serverSupabase.rpc(
    'save_property_action_followup',
    {
      p_actor: user.id,
      p_property: params.id,
      p_kind: value.kind,
      p_source: value.sourceId,
      p_revision: value.revision,
      p_assignee: value.assignedTo,
      p_due: value.dueAt,
      p_waiting: value.waitingFor,
      p_note: value.note,
    }
  );
  if (error?.code === '40001')
    return NextResponse.json(
      { error: 'Someone changed this follow-up. Reload before saving.' },
      { status: 409 }
    );
  if (error) throw error;
  return NextResponse.json({ followup: data });
});

import { serverSupabase } from '@/lib/api/supabaseServer';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import type { ReportStaffFollowup } from '@mintenance/shared';

function toWaitingFor(value: unknown): ReportStaffFollowup['waitingFor'] {
  switch (value) {
    case 'manager':
    case 'tenant':
    case 'contractor':
    case 'approval':
      return value;
    default:
      return null;
  }
}

// This projection is for property staff. The shared conversation response
// never includes the private notes from property_action_updates.
export async function readReportStaffFollowup(
  actor: string,
  reportId: string,
  propertyId: string
): Promise<ReportStaffFollowup | undefined> {
  const access = await PropertyTeamService.authorize(
    actor,
    propertyId,
    'manage_maintenance'
  );
  if (!access.authorized) return undefined;

  const result = await serverSupabase
    .from('property_action_followups')
    .select('assigned_to,due_at,waiting_for')
    .eq('kind', 'report')
    .eq('source_id', reportId)
    .eq('property_id', propertyId)
    .maybeSingle();
  if (result.error) throw result.error;

  const assigneeId = result.data?.assigned_to;
  const staff: ReportStaffFollowup = {
    propertyId,
    canManage: access.role === 'owner',
    assigneeName: null,
    needsReassignment: false,
    dueAt: result.data?.due_at ?? null,
    waitingFor: toWaitingFor(result.data?.waiting_for),
  };
  if (!assigneeId) return staff;

  const [person, assigneeAccess] = await Promise.all([
    serverSupabase
      .from('profiles')
      .select('first_name,last_name')
      .eq('id', assigneeId)
      .is('deleted_at', null)
      .maybeSingle(),
    PropertyTeamService.authorize(assigneeId, propertyId, 'manage_maintenance'),
  ]);
  if (person.error) throw person.error;
  if (!person.data || !assigneeAccess.authorized) {
    return { ...staff, needsReassignment: true };
  }
  return {
    ...staff,
    assigneeName:
      assigneeId === actor
        ? 'You'
        : [person.data.first_name, person.data.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Property team member',
  };
}

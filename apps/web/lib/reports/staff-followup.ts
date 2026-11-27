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
  propertyId: string,
  isOpenInternalReport: boolean
): Promise<ReportStaffFollowup | undefined> {
  const access = await PropertyTeamService.authorize(
    actor,
    propertyId,
    'manage_maintenance'
  );
  if (!access.authorized) return undefined;

  const result = await serverSupabase
    .from('property_action_followups')
    .select('*')
    .eq('kind', 'report')
    .eq('source_id', reportId)
    .eq('property_id', propertyId)
    .maybeSingle();
  if (result.error) throw result.error;

  const row = result.data;
  const assigneeId = row?.assigned_to;
  if (access.role !== 'owner' && actor !== assigneeId) return undefined;
  const completion =
    row?.completion_note && row.completion_at
      ? {
          note: String(row.completion_note),
          submittedAt: String(row.completion_at),
          submittedBy: 'Property teammate',
          awaitingReview:
            isOpenInternalReport && row.completion_revision === row.revision,
        }
      : undefined;
  if (completion && row?.completion_by) {
    const author = await serverSupabase
      .from('profiles')
      .select('first_name,last_name')
      .eq('id', row.completion_by)
      .is('deleted_at', null)
      .maybeSingle();
    if (author.error) throw author.error;
    completion.submittedBy =
      row.completion_by === actor
        ? 'You'
        : [author.data?.first_name, author.data?.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Property teammate';
  }
  const staff: ReportStaffFollowup = {
    propertyId,
    canManage: access.role === 'owner',
    assigneeName: null,
    needsReassignment: false,
    dueAt: result.data?.due_at ?? null,
    waitingFor: toWaitingFor(result.data?.waiting_for),
    ...(completion ? { completion } : {}),
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
    // Before the migration is applied, the completion fields are absent.
    ...(isOpenInternalReport &&
    access.role !== 'owner' &&
    actor === assigneeId &&
    row &&
    Object.prototype.hasOwnProperty.call(row, 'completion_revision') &&
    !completion?.awaitingReview
      ? { completionRevision: row.revision as number }
      : {}),
    assigneeName:
      assigneeId === actor
        ? 'You'
        : [person.data.first_name, person.data.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Property team member',
  };
}

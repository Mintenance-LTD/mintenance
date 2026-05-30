import {
  ContractorMeeting,
  MeetingUpdate,
  LocationData,
} from '@mintenance/types';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { mapAppointmentToMeeting, type AppointmentRow } from './MeetingHelpers';

// 2026-05-26 audit-55 P1: Helper for slicing an ISO datetime into the
// HH:MM strings the appointment route expects. The route's
// createAppointmentSchema regex-checks HH:MM[:SS] (audit-43 P2) and
// .refine(endTime > startTime), so we can't send full ISO datetimes.
function isoToTimeHHMM(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function addMinutesToHHMM(hhmm: string, minutes: number): string {
  const parts = hhmm.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export async function createMeeting(meetingData: {
  jobId: string;
  homeownerId: string;
  contractorId: string;
  scheduledDateTime: string;
  meetingType: 'site_visit' | 'consultation' | 'work_session';
  location: LocationData & { address?: string };
  duration: number;
  notes?: string;
}): Promise<ContractorMeeting> {
  const context = {
    service: 'MeetingService',
    method: 'createMeeting',
    userId: meetingData.contractorId,
    params: { jobId: meetingData.jobId, meetingType: meetingData.meetingType },
  };
  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(meetingData.jobId, 'Job ID', context);
    ServiceErrorHandler.validateRequired(
      meetingData.homeownerId,
      'Homeowner ID',
      context
    );
    ServiceErrorHandler.validateRequired(
      meetingData.contractorId,
      'Contractor ID',
      context
    );
    ServiceErrorHandler.validateRequired(
      meetingData.scheduledDateTime,
      'Scheduled date time',
      context
    );

    // 2026-05-26 audit-55 P1: previously POSTed to /api/contractor/meetings
    // which writes to a `contractor_meetings` table (0 live rows). The
    // rest of the calendar flow reads /api/appointments (live `appointments`
    // table has 9 rows). Route through the canonical path and conform to
    // its schema: HH:MM time strings + endTime > startTime + UUID jobId.
    //
    // Drop client_name (was wrongly the homeowner UUID — appointment
    // contract treats client_name as a display string and resolves the
    // actual client via job lookup + client_id) and supply endTime
    // derived from duration (defaults to 60min if duration is 0).
    const startTime = isoToTimeHHMM(meetingData.scheduledDateTime);
    const durationMin = meetingData.duration > 0 ? meetingData.duration : 60;
    const endTime = addMinutesToHHMM(startTime, durationMin);
    const appointmentDate = meetingData.scheduledDateTime.split('T')[0];

    const response = await mobileApiClient.post<{
      appointment: AppointmentRow;
    }>('/api/contractor/appointments', {
      title: `${meetingData.meetingType} meeting`,
      appointmentDate,
      startTime,
      endTime,
      locationType:
        meetingData.meetingType === 'consultation' ? 'phone' : 'onsite',
      locationAddress: meetingData.location.address || undefined,
      jobId: meetingData.jobId,
      notes: meetingData.notes || undefined,
    });

    // Coerce the appointment row into the ContractorMeeting shape the
    // viewModel + downstream consumers expect. The two tables have
    // different column names so we can't reuse mapDatabaseToMeeting
    // (which assumes contractor_meetings columns). Derived fields:
    //   - scheduled_datetime = `${appointment_date}T${start_time}Z`
    //   - duration = duration_minutes (server stamps this via trigger)
    //   - latitude / longitude carry forward from the request
    const apt = response.appointment;
    const scheduledIso = `${apt.appointment_date}T${apt.start_time}`;
    const coerced: ContractorMeeting = {
      id: apt.id,
      job_id: apt.job_id ?? meetingData.jobId,
      homeowner_id: meetingData.homeownerId,
      contractor_id: apt.contractor_id,
      scheduled_datetime: scheduledIso,
      status: (apt.status as ContractorMeeting['status']) ?? 'scheduled',
      meeting_type: meetingData.meetingType,
      latitude: meetingData.location.latitude,
      longitude: meetingData.location.longitude,
      address: apt.location_address ?? meetingData.location.address,
      duration: apt.duration_minutes ?? durationMin,
      notes: apt.notes ?? meetingData.notes,
      created_at: apt.created_at ?? new Date().toISOString(),
      updated_at: apt.updated_at ?? new Date().toISOString(),
    };
    return coerced;
  }, context);
  if (!result.success || !result.data)
    throw new Error('Failed to create meeting');
  return result.data;
}

// 2026-05-27 audit-78 P1: read paths migrated off legacy
// /api/contractor/meetings (writes to contractor_meetings — 0 live
// rows) to /api/contractor/appointments[/[id]] (writes to
// appointments — 9 live rows). createMeeting was migrated 2026-05-26
// (audit-55); these read/update siblings were left pointing at the
// dead endpoint and the Meeting Details screen was rendering empty
// for every live appointment. Coercion handled by
// mapAppointmentToMeeting which maps appointments → ContractorMeeting.
export async function getMeetingById(
  meetingId: string
): Promise<ContractorMeeting | null> {
  try {
    const response = await mobileApiClient.get<{
      appointment: AppointmentRow;
    }>(`/api/contractor/appointments/${meetingId}`);
    return response.appointment
      ? mapAppointmentToMeeting(response.appointment)
      : null;
  } catch (error) {
    // 404 means meeting not found
    const apiError = error as { statusCode?: number };
    if (apiError.statusCode === 404) return null;
    logger.error('Error fetching meeting:', error);
    throw error;
  }
}

export async function getMeetingsForUser(
  userId: string,
  role: 'homeowner' | 'contractor',
  status?: string
): Promise<ContractorMeeting[]> {
  try {
    // Contractor: /api/contractor/appointments auto-scopes via auth.uid().
    // Homeowner: /api/appointments is role-agnostic and resolves the
    // calling user's role server-side (audit-21 P1 2026-05-23). Both
    // emit `appointments[]` so we coerce uniformly.
    const url =
      role === 'contractor'
        ? `/api/contractor/appointments${status ? `?status=${encodeURIComponent(status)}` : ''}`
        : `/api/appointments`;
    const response = await mobileApiClient.get<{
      appointments: AppointmentRow[];
    }>(url);
    return (response.appointments || []).map(mapAppointmentToMeeting);
  } catch (error) {
    logger.error('Error fetching user meetings:', error);
    throw error;
  }
}

export async function updateMeetingStatus(
  meetingId: string,
  status: ContractorMeeting['status'],
  _updatedBy: string,
  notes?: string
): Promise<ContractorMeeting> {
  try {
    const response = await mobileApiClient.patch<{
      appointment: AppointmentRow;
    }>(`/api/contractor/appointments/${meetingId}`, {
      status,
      notes: notes || undefined,
    });
    return mapAppointmentToMeeting(response.appointment);
  } catch (error) {
    logger.error('Error updating meeting status:', error);
    throw error;
  }
}

export async function rescheduleMeeting(
  meetingId: string,
  newDateTime: string,
  _updatedBy: string,
  reason?: string
): Promise<ContractorMeeting> {
  try {
    // appointments PATCH expects HH:MM[:SS] start/end times (audit-43
    // P2 regex). Slice the ISO datetime back into the date + time
    // components the schema accepts. The duration trigger keeps
    // duration_minutes in sync on the server side.
    const d = new Date(newDateTime);
    const appointmentDate = d.toISOString().split('T')[0];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const startTime = `${hh}:${mm}`;
    // Preserve the original duration by adding 60 min if we don't have
    // the prior end_time on hand; the trigger will recompute regardless.
    const endTotal = d.getHours() * 60 + d.getMinutes() + 60;
    const endHh = String(Math.floor(endTotal / 60) % 24).padStart(2, '0');
    const endMm = String(endTotal % 60).padStart(2, '0');
    const endTime = `${endHh}:${endMm}`;

    const response = await mobileApiClient.patch<{
      appointment: AppointmentRow;
    }>(`/api/contractor/appointments/${meetingId}`, {
      appointmentDate,
      startTime,
      endTime,
      status: 'rescheduled',
      notes: reason || undefined,
    });
    return mapAppointmentToMeeting(response.appointment);
  } catch (error) {
    logger.error('Error rescheduling meeting:', error);
    throw error;
  }
}

// 2026-05-27 audit-78 P1: meeting_updates is 0 live rows and there's
// no appointments-side equivalent timeline table. The PATCH endpoint
// stamps cancellation_reason / cancelled_at / completed_at directly
// on the appointment row, which is what the Meeting Details screen
// actually surfaces. Keep these wrappers as no-ops so the call sites
// (MeetingCommunicationPanel, meeting-details/actions) compile and
// return sensible shapes; the timeline section just renders empty.
// A future audit can add a proper appointment_history table if the
// product needs an immutable status log.
export async function createMeetingUpdate(updateData: {
  meetingId: string;
  updateType: MeetingUpdate['updateType'];
  message: string;
  updatedBy: string;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<MeetingUpdate> {
  return {
    id: `${updateData.meetingId}-${Date.now()}`,
    meetingId: updateData.meetingId,
    updateType: updateData.updateType,
    message: updateData.message,
    updatedBy: updateData.updatedBy,
    timestamp: new Date().toISOString(),
    oldValue: updateData.oldValue,
    newValue: updateData.newValue,
  };
}

export async function getMeetingUpdates(
  _meetingId: string
): Promise<MeetingUpdate[]> {
  return [];
}

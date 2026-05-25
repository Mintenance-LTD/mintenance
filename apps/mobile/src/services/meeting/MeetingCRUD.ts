import {
  ContractorMeeting,
  MeetingUpdate,
  LocationData,
} from '@mintenance/types';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { mapDatabaseToMeeting } from './MeetingHelpers';
import type { DatabaseMeetingRow } from './types';

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

    interface AppointmentRow {
      id: string;
      contractor_id: string;
      client_id?: string | null;
      job_id?: string | null;
      title?: string;
      appointment_date: string;
      start_time: string;
      end_time?: string | null;
      duration_minutes?: number | null;
      location_address?: string | null;
      notes?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    }

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

export async function getMeetingById(
  meetingId: string
): Promise<ContractorMeeting | null> {
  try {
    const response = await mobileApiClient.get<{ meeting: DatabaseMeetingRow }>(
      `/api/contractor/meetings/${meetingId}`
    );
    return response.meeting ? mapDatabaseToMeeting(response.meeting) : null;
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
    const params = new URLSearchParams();
    params.set('userId', userId);
    params.set('role', role);
    if (status) params.set('status', status);
    const response = await mobileApiClient.get<{
      meetings: DatabaseMeetingRow[];
    }>(`/api/contractor/meetings?${params.toString()}`);
    return (response.meetings || []).map(mapDatabaseToMeeting);
  } catch (error) {
    logger.error('Error fetching user meetings:', error);
    throw error;
  }
}

export async function updateMeetingStatus(
  meetingId: string,
  status: ContractorMeeting['status'],
  updatedBy: string,
  notes?: string
): Promise<ContractorMeeting> {
  try {
    const response = await mobileApiClient.patch<{
      meeting: DatabaseMeetingRow;
    }>(`/api/contractor/meetings/${meetingId}`, {
      status,
      notes: notes || undefined,
    });

    return mapDatabaseToMeeting(response.meeting);
  } catch (error) {
    logger.error('Error updating meeting status:', error);
    throw error;
  }
}

export async function rescheduleMeeting(
  meetingId: string,
  newDateTime: string,
  updatedBy: string,
  reason?: string
): Promise<ContractorMeeting> {
  try {
    const response = await mobileApiClient.patch<{
      meeting: DatabaseMeetingRow;
    }>(`/api/contractor/meetings/${meetingId}`, {
      meeting_date: newDateTime.split('T')[0],
      start_time: newDateTime,
      status: 'rescheduled',
      reschedule_reason: reason || undefined,
      notes: reason || undefined,
    });

    return mapDatabaseToMeeting(response.meeting);
  } catch (error) {
    logger.error('Error rescheduling meeting:', error);
    throw error;
  }
}

export async function createMeetingUpdate(updateData: {
  meetingId: string;
  updateType: MeetingUpdate['updateType'];
  message: string;
  updatedBy: string;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<MeetingUpdate> {
  try {
    const response = await mobileApiClient.post<{
      update: {
        id: string;
        meeting_id: string;
        update_type: string;
        message: string;
        updated_by: string;
        timestamp: string;
        old_value?: string;
        new_value?: string;
      };
    }>(`/api/contractor/meetings/${updateData.meetingId}/updates`, {
      update_type: updateData.updateType,
      message: updateData.message,
      updated_by: updateData.updatedBy,
      old_value: updateData.oldValue
        ? JSON.stringify(updateData.oldValue)
        : null,
      new_value: updateData.newValue
        ? JSON.stringify(updateData.newValue)
        : null,
    });
    const data = response.update;
    return {
      id: data.id,
      meetingId: data.meeting_id,
      updateType: data.update_type as MeetingUpdate['updateType'],
      message: data.message,
      updatedBy: data.updated_by,
      timestamp: data.timestamp,
      oldValue: data.old_value ? JSON.parse(data.old_value) : undefined,
      newValue: data.new_value ? JSON.parse(data.new_value) : undefined,
    };
  } catch (error) {
    logger.error('Error creating meeting update:', error);
    throw error;
  }
}

export async function getMeetingUpdates(
  meetingId: string
): Promise<MeetingUpdate[]> {
  try {
    const response = await mobileApiClient.get<{
      updates: Array<{
        id: string;
        meeting_id: string;
        update_type: string;
        message: string;
        updated_by: string;
        timestamp: string;
        old_value?: string;
        new_value?: string;
      }>;
    }>(`/api/contractor/meetings/${meetingId}/updates`);
    return (response.updates || []).map((update) => ({
      id: update.id,
      meetingId: update.meeting_id,
      updateType: update.update_type as MeetingUpdate['updateType'],
      message: update.message,
      updatedBy: update.updated_by,
      timestamp: update.timestamp,
      oldValue: update.old_value ? JSON.parse(update.old_value) : undefined,
      newValue: update.new_value ? JSON.parse(update.new_value) : undefined,
    }));
  } catch (error) {
    logger.error('Error fetching meeting updates:', error);
    throw error;
  }
}

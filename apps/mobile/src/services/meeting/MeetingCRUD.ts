import { ContractorMeeting, MeetingUpdate, LocationData } from '@mintenance/types';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { mapDatabaseToMeeting } from './MeetingHelpers';
import type { DatabaseMeetingRow } from './types';

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
  const context = { service: 'MeetingService', method: 'createMeeting', userId: meetingData.contractorId, params: { jobId: meetingData.jobId, meetingType: meetingData.meetingType } };
  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(meetingData.jobId, 'Job ID', context);
    ServiceErrorHandler.validateRequired(meetingData.homeownerId, 'Homeowner ID', context);
    ServiceErrorHandler.validateRequired(meetingData.contractorId, 'Contractor ID', context);
    ServiceErrorHandler.validateRequired(meetingData.scheduledDateTime, 'Scheduled date time', context);

    const response = await mobileApiClient.post<{ meeting: DatabaseMeetingRow }>(
      '/api/contractor/meetings',
      {
        title: `${meetingData.meetingType} meeting`,
        client_name: meetingData.homeownerId,
        meeting_date: meetingData.scheduledDateTime.split('T')[0],
        start_time: meetingData.scheduledDateTime,
        end_time: null,
        location: meetingData.location.address || null,
        notes: meetingData.notes || null,
        job_id: meetingData.jobId,
      }
    );

    return mapDatabaseToMeeting(response.meeting);
  }, context);
  if (!result.success || !result.data) throw new Error('Failed to create meeting');
  return result.data;
}

export async function getMeetingById(meetingId: string): Promise<ContractorMeeting | null> {
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

export async function getMeetingsForUser(userId: string, role: 'homeowner' | 'contractor', status?: string): Promise<ContractorMeeting[]> {
  try {
    const params = new URLSearchParams();
    params.set('userId', userId);
    params.set('role', role);
    if (status) params.set('status', status);
    const response = await mobileApiClient.get<{ meetings: DatabaseMeetingRow[] }>(
      `/api/contractor/meetings?${params.toString()}`
    );
    return (response.meetings || []).map(mapDatabaseToMeeting);
  } catch (error) {
    logger.error('Error fetching user meetings:', error);
    throw error;
  }
}

export async function updateMeetingStatus(meetingId: string, status: ContractorMeeting['status'], updatedBy: string, notes?: string): Promise<ContractorMeeting> {
  try {
    const response = await mobileApiClient.patch<{ meeting: DatabaseMeetingRow }>(
      `/api/contractor/meetings/${meetingId}`,
      { status, notes: notes || undefined }
    );

    return mapDatabaseToMeeting(response.meeting);
  } catch (error) {
    logger.error('Error updating meeting status:', error);
    throw error;
  }
}

export async function rescheduleMeeting(meetingId: string, newDateTime: string, updatedBy: string, reason?: string): Promise<ContractorMeeting> {
  try {
    const response = await mobileApiClient.patch<{ meeting: DatabaseMeetingRow }>(
      `/api/contractor/meetings/${meetingId}`,
      {
        meeting_date: newDateTime.split('T')[0],
        start_time: newDateTime,
        status: 'rescheduled',
        reschedule_reason: reason || undefined,
        notes: reason || undefined,
      }
    );

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
    const response = await mobileApiClient.post<{ update: { id: string; meeting_id: string; update_type: string; message: string; updated_by: string; timestamp: string; old_value?: string; new_value?: string } }>(
      `/api/contractor/meetings/${updateData.meetingId}/updates`,
      {
        update_type: updateData.updateType,
        message: updateData.message,
        updated_by: updateData.updatedBy,
        old_value: updateData.oldValue ? JSON.stringify(updateData.oldValue) : null,
        new_value: updateData.newValue ? JSON.stringify(updateData.newValue) : null,
      }
    );
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

export async function getMeetingUpdates(meetingId: string): Promise<MeetingUpdate[]> {
  try {
    const response = await mobileApiClient.get<{ updates: Array<{ id: string; meeting_id: string; update_type: string; message: string; updated_by: string; timestamp: string; old_value?: string; new_value?: string }> }>(
      `/api/contractor/meetings/${meetingId}/updates`
    );
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

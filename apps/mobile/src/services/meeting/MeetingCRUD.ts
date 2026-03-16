import { supabase } from '../../config/supabase';
import { ContractorMeeting, MeetingUpdate, LocationData } from '@mintenance/types';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { normalizeSupabaseError, mapDatabaseToMeeting } from './MeetingHelpers';
import type { DatabaseMeetingUpdateRow } from './types';

const MEETING_SELECT = `
  *,
  homeowner:homeowner_id(id, first_name, last_name, email, phone, profile_image_url),
  contractor:contractor_id(id, first_name, last_name, email, phone, profile_image_url, rating),
  job:job_id(id, title, description, budget, status)
`;

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

    const response = await mobileApiClient.post<{ meeting: Record<string, unknown> }>(
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
    const { data, error } = await supabase.from('contractor_meetings').select(MEETING_SELECT).eq('id', meetingId).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw normalizeSupabaseError(error, 'Failed to fetch meeting');
    }
    return data ? mapDatabaseToMeeting(data) : null;
  } catch (error) {
    logger.error('Error fetching meeting:', error);
    throw error;
  }
}

export async function getMeetingsForUser(userId: string, role: 'homeowner' | 'contractor', status?: string): Promise<ContractorMeeting[]> {
  try {
    const roleColumn = role === 'homeowner' ? 'homeowner_id' : 'contractor_id';
    let query = supabase.from('contractor_meetings').select(MEETING_SELECT).eq(roleColumn, userId).order('scheduled_datetime', { ascending: true });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw normalizeSupabaseError(error, 'Failed to fetch meetings');
    return (data || []).map(mapDatabaseToMeeting);
  } catch (error) {
    logger.error('Error fetching user meetings:', error);
    throw error;
  }
}

export async function updateMeetingStatus(meetingId: string, status: ContractorMeeting['status'], updatedBy: string, notes?: string): Promise<ContractorMeeting> {
  try {
    const response = await mobileApiClient.patch<{ meeting: Record<string, unknown> }>(
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
    const response = await mobileApiClient.patch<{ meeting: Record<string, unknown> }>(
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
    // Meeting updates are now created server-side by the PATCH /api/contractor/meetings/[id] route
    // when status changes or reschedules occur. This function is kept for backward compatibility
    // and for cases where a standalone update record is needed.
    const { data, error } = await supabase.from('meeting_updates').insert({
      meeting_id: updateData.meetingId,
      update_type: updateData.updateType,
      message: updateData.message,
      updated_by: updateData.updatedBy,
      old_value: updateData.oldValue ? JSON.stringify(updateData.oldValue) : null,
      new_value: updateData.newValue ? JSON.stringify(updateData.newValue) : null,
      timestamp: new Date().toISOString(),
    }).select().single();
    if (error) throw normalizeSupabaseError(error, 'Failed to create meeting update');
    if (!data) throw new Error('Failed to create meeting update');
    return { id: data.id, meetingId: data.meeting_id, updateType: data.update_type, message: data.message, updatedBy: data.updated_by, timestamp: data.timestamp, oldValue: data.old_value ? JSON.parse(data.old_value) : undefined, newValue: data.new_value ? JSON.parse(data.new_value) : undefined };
  } catch (error) {
    logger.error('Error creating meeting update:', error);
    throw error;
  }
}

export async function getMeetingUpdates(meetingId: string): Promise<MeetingUpdate[]> {
  try {
    const { data, error } = await supabase.from('meeting_updates').select('*').eq('meeting_id', meetingId).order('timestamp', { ascending: false });
    if (error) throw normalizeSupabaseError(error, 'Failed to fetch meeting updates');
    return (data || []).map((update: DatabaseMeetingUpdateRow): MeetingUpdate => ({
      id: update.id,
      meetingId: update.meeting_id,
      updateType: update.update_type,
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

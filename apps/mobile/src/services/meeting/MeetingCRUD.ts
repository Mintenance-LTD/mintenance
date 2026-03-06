import { supabase } from '../../config/supabase';
import { ContractorMeeting, MeetingUpdate, LocationData } from '@mintenance/types';
import { logger } from '../../utils/logger';
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

    const { data, error } = await supabase.from('contractor_meetings')
      .insert({
        job_id: meetingData.jobId,
        homeowner_id: meetingData.homeownerId,
        contractor_id: meetingData.contractorId,
        scheduled_datetime: meetingData.scheduledDateTime,
        meeting_type: meetingData.meetingType,
        latitude: meetingData.location.latitude,
        longitude: meetingData.location.longitude,
        address: meetingData.location.address,
        duration: meetingData.duration,
        notes: meetingData.notes,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw ServiceErrorHandler.handleDatabaseError(error, context);
    return mapDatabaseToMeeting(data);
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
    const { data, error } = await supabase.from('contractor_meetings')
      .update({ status, notes: notes || undefined, updated_at: new Date().toISOString() })
      .eq('id', meetingId).select().single();
    if (error) throw normalizeSupabaseError(error, 'Failed to update meeting status');
    if (!data) throw new Error('Failed to update meeting');
    await createMeetingUpdate({ meetingId, updateType: 'status_change', message: `Meeting status changed to ${status}`, updatedBy, newValue: status });
    return mapDatabaseToMeeting(data);
  } catch (error) {
    logger.error('Error updating meeting status:', error);
    throw error;
  }
}

export async function rescheduleMeeting(meetingId: string, newDateTime: string, updatedBy: string, reason?: string): Promise<ContractorMeeting> {
  try {
    const currentMeeting = await getMeetingById(meetingId);
    const { data, error } = await supabase.from('contractor_meetings')
      .update({ scheduled_datetime: newDateTime, status: 'rescheduled', notes: reason || undefined, updated_at: new Date().toISOString() })
      .eq('id', meetingId).select().single();
    if (error) throw normalizeSupabaseError(error, 'Failed to reschedule meeting');
    if (!data) throw new Error('Failed to reschedule meeting');
    await createMeetingUpdate({ meetingId, updateType: 'rescheduled', message: reason || 'Meeting rescheduled', updatedBy, oldValue: currentMeeting?.scheduled_datetime, newValue: newDateTime });
    return mapDatabaseToMeeting(data);
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

import { supabase } from '../../config/supabase';
import { LocationData, ContractorMeeting } from '@mintenance/types';
import { logger } from '../../utils/logger';
import { JobContextLocationService, ContractorLocationContext } from '../JobContextLocationService';
import { normalizeSupabaseError } from './MeetingHelpers';
import { getMeetingById, updateMeetingStatus, createMeetingUpdate } from './MeetingCRUD';
import type { ContractorLocation, DatabaseContractorLocationRow, RealtimePayload } from './types';

export async function updateContractorLocation(
  contractorId: string,
  location: LocationData,
  meetingId?: string
): Promise<ContractorLocation> {
  try {
    const { data, error } = await supabase.from('contractor_locations').upsert({
      contractor_id: contractorId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: 10,
      timestamp: new Date().toISOString(),
      is_active: true,
      meeting_id: meetingId || null,
    }).select().single();
    if (error) throw normalizeSupabaseError(error, 'Failed to update contractor location');
    if (!data) throw new Error('Failed to update contractor location');
    return { id: data.id, contractorId: data.contractor_id, latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy, timestamp: data.timestamp, isActive: data.is_active, meetingId: data.meeting_id };
  } catch (error) {
    logger.error('Error updating contractor location:', error);
    throw error;
  }
}

export async function getContractorLocation(contractorId: string): Promise<ContractorLocation | null> {
  try {
    const { data, error } = await supabase.from('contractor_locations').select('*').eq('contractor_id', contractorId).eq('is_active', true).order('timestamp', { ascending: false }).limit(1).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw normalizeSupabaseError(error, 'Failed to fetch contractor location');
    }
    return data ? { id: data.id, contractorId: data.contractor_id, latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy, timestamp: data.timestamp, isActive: data.is_active, meetingId: data.meeting_id } : null;
  } catch (error) {
    logger.error('Error fetching contractor location:', error);
    throw error;
  }
}

export function subscribeToContractorLocation(
  contractorId: string,
  callback: (location: ContractorLocation | null) => void
) {
  return supabase.channel(`contractor_location_${contractorId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contractor_locations', filter: `contractor_id=eq.${contractorId}` },
      (payload: RealtimePayload<DatabaseContractorLocationRow>) => {
        if (payload.new) {
          callback({ id: payload.new.id, contractorId: payload.new.contractor_id, latitude: payload.new.latitude, longitude: payload.new.longitude, accuracy: payload.new.accuracy, timestamp: payload.new.timestamp, isActive: payload.new.is_active, meetingId: payload.new.meeting_id });
        }
      })
    .subscribe();
}

export function subscribeToMeetingUpdates(
  meetingId: string,
  callback: (meeting: ContractorMeeting | null) => void
) {
  return supabase.channel(`meeting_${meetingId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contractor_meetings', filter: `id=eq.${meetingId}` },
      async (payload: RealtimePayload<{ id: string }>) => {
        if (payload.new) {
          const meeting = await getMeetingById(payload.new.id);
          callback(meeting);
        }
      })
    .subscribe();
}

export function subscribeToContractorTravelLocation(
  meetingId: string,
  contractorId: string,
  callback: (data: { location: ContractorLocation; eta: number; context: ContractorLocationContext }) => void
) {
  return supabase.channel(`contractor_travel_${meetingId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contractor_locations', filter: `contractor_id=eq.${contractorId} AND meeting_id=eq.${meetingId} AND is_active=eq.true` },
      (payload: RealtimePayload<DatabaseContractorLocationRow>) => {
        if (payload.new) {
          callback({ location: { id: payload.new.id, contractorId: payload.new.contractor_id, latitude: payload.new.latitude, longitude: payload.new.longitude, accuracy: payload.new.accuracy, timestamp: payload.new.timestamp, isActive: payload.new.is_active, meetingId: payload.new.meeting_id }, eta: payload.new.eta_minutes || 0, context: payload.new.context || ContractorLocationContext.TRAVELING_TO_JOB });
        }
      })
    .subscribe();
}

export async function startTravelTracking(
  meetingId: string,
  contractorId: string,
  onLocationUpdate?: (location: { latitude: number; longitude: number; eta: number }) => void
): Promise<JobContextLocationService> {
  try {
    const meeting = await getMeetingById(meetingId);
    if (!meeting) throw new Error('Meeting not found');
    if (!meeting.latitude || !meeting.longitude) throw new Error('Meeting location not set');
    await updateMeetingStatus(meetingId, 'in_progress' as ContractorMeeting['status'], contractorId, 'Contractor started traveling to meeting location');
    await createMeetingUpdate({ meetingId, updateType: 'contractor_enroute', message: 'Contractor is traveling to the meeting location', updatedBy: contractorId });
    const locationService = new JobContextLocationService();
    await locationService.startJobTracking(contractorId, meeting.job_id || '', meetingId, { latitude: meeting.latitude, longitude: meeting.longitude }, async (location, eta) => {
      if (onLocationUpdate) onLocationUpdate({ latitude: location.coords.latitude, longitude: location.coords.longitude, eta });
    });
    logger.info('Started travel tracking for meeting', { meetingId, contractorId });
    return locationService;
  } catch (error) {
    logger.error('Error starting travel tracking', error);
    throw error;
  }
}

export async function markArrived(
  meetingId: string,
  contractorId: string,
  locationService: JobContextLocationService
): Promise<void> {
  try {
    const meeting = await getMeetingById(meetingId);
    if (!meeting) throw new Error('Meeting not found');
    await locationService.markArrived(meeting.job_id || '', meetingId);
    await updateMeetingStatus(meetingId, 'in_progress' as ContractorMeeting['status'], contractorId, 'Contractor has arrived at meeting location');
    await createMeetingUpdate({ meetingId, updateType: 'contractor_arrived', message: 'Contractor has arrived at the meeting location', updatedBy: contractorId });
    logger.info('Contractor marked as arrived', { meetingId, contractorId });
  } catch (error) {
    logger.error('Error marking contractor as arrived', error);
    throw error;
  }
}

import { supabase } from '../../config/supabase';
import { LocationData, ContractorMeeting } from '@mintenance/types';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import {
  JobContextLocationService,
  ContractorLocationContext,
} from '../JobContextLocationService';

import {
  getMeetingById,
  updateMeetingStatus,
  createMeetingUpdate,
} from './MeetingCRUD';
import type {
  ContractorLocation,
  DatabaseContractorLocationRow,
  RealtimePayload,
} from './types';

export async function updateContractorLocation(
  contractorId: string,
  location: LocationData,
  meetingId?: string
): Promise<ContractorLocation> {
  try {
    const response = await mobileApiClient.post<{
      success: boolean;
      location: {
        id: string;
        latitude: number;
        longitude: number;
        accuracy: number | null;
        timestamp: string;
      };
    }>(`/api/contractors/${encodeURIComponent(contractorId)}/location`, {
      latitude: location.latitude,
      longitude: location.longitude,
    });
    return {
      id: response.location?.id || contractorId,
      contractorId,
      latitude: response.location?.latitude || location.latitude,
      longitude: response.location?.longitude || location.longitude,
      accuracy: response.location?.accuracy || 10,
      timestamp: response.location?.timestamp || new Date().toISOString(),
      isActive: true,
      meetingId: meetingId || null,
    };
  } catch (error) {
    logger.error('Error updating contractor location:', error);
    throw error;
  }
}

export async function getContractorLocation(
  contractorId: string,
  opts?: { jobId?: string }
): Promise<ContractorLocation | null> {
  try {
    // 2026-05-27 audit-78 P2: the location GET requires `job_id` for
    // homeowner reads (route lines 211-221). The Meeting Details
    // screen previously called without one, so the homeowner-side
    // initial fetch hard-403'd before any live ping could surface.
    // Callers now thread the meeting's job_id; contractor-self and
    // admin reads ignore the param.
    const qs = opts?.jobId ? `?job_id=${encodeURIComponent(opts.jobId)}` : '';
    const response = await mobileApiClient.get<{
      location: {
        id: string;
        latitude: number;
        longitude: number;
        accuracy: number | null;
        location_timestamp?: string;
        timestamp?: string;
        is_sharing_location?: boolean;
      };
    }>(`/api/contractors/${encodeURIComponent(contractorId)}/location${qs}`);
    return response?.location
      ? {
          id: response.location.id,
          contractorId,
          latitude: response.location.latitude,
          longitude: response.location.longitude,
          accuracy: response.location.accuracy || 10,
          timestamp:
            response.location.timestamp ||
            response.location.location_timestamp ||
            new Date().toISOString(),
          isActive: response.location.is_sharing_location ?? true,
          meetingId: null,
        }
      : null;
  } catch (error) {
    // 404 means no active location found
    const apiError = error as { statusCode?: number };
    if (apiError.statusCode === 404) return null;
    logger.error('Error fetching contractor location:', error);
    throw error;
  }
}

export function subscribeToContractorLocation(
  contractorId: string,
  callback: (location: ContractorLocation | null) => void,
  opts?: { jobId?: string }
) {
  // 2026-05-27 audit-78 P2: scope the realtime filter to the meeting's
  // job_id when known so the homeowner channel only receives the ping
  // they actually have read access to. Without job_id we keep the
  // older contractor-wide filter for backwards compat (admin / mocks).
  const filter = opts?.jobId
    ? `contractor_id=eq.${contractorId} AND job_id=eq.${opts.jobId}`
    : `contractor_id=eq.${contractorId}`;
  return supabase
    .channel(
      `contractor_location_${contractorId}${opts?.jobId ? `_${opts.jobId}` : ''}`
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contractor_locations',
        filter,
      },
      (rawPayload: unknown) => {
        const payload =
          rawPayload as RealtimePayload<DatabaseContractorLocationRow>;
        if (payload.new) {
          callback({
            id: payload.new.id,
            contractorId: payload.new.contractor_id,
            latitude: payload.new.latitude,
            longitude: payload.new.longitude,
            accuracy: payload.new.accuracy,
            timestamp: payload.new.timestamp,
            isActive: payload.new.is_active,
            meetingId: payload.new.meeting_id,
          });
        }
      }
    )
    .subscribe();
}

export function subscribeToMeetingUpdates(
  meetingId: string,
  callback: (meeting: ContractorMeeting | null) => void
) {
  return supabase
    .channel(`meeting_${meetingId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contractor_meetings',
        filter: `id=eq.${meetingId}`,
      },
      async (rawPayload: unknown) => {
        const payload = rawPayload as RealtimePayload<{ id: string }>;
        if (payload.new) {
          const meeting = await getMeetingById(payload.new.id);
          callback(meeting);
        }
      }
    )
    .subscribe();
}

export function subscribeToContractorTravelLocation(
  meetingId: string,
  contractorId: string,
  callback: (data: {
    location: ContractorLocation;
    eta: number;
    context: ContractorLocationContext;
  }) => void
) {
  return supabase
    .channel(`contractor_travel_${meetingId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contractor_locations',
        filter: `contractor_id=eq.${contractorId} AND meeting_id=eq.${meetingId} AND is_active=eq.true`,
      },
      (rawPayload: unknown) => {
        const payload =
          rawPayload as RealtimePayload<DatabaseContractorLocationRow>;
        if (payload.new) {
          callback({
            location: {
              id: payload.new.id,
              contractorId: payload.new.contractor_id,
              latitude: payload.new.latitude,
              longitude: payload.new.longitude,
              accuracy: payload.new.accuracy,
              timestamp: payload.new.timestamp,
              isActive: payload.new.is_active,
              meetingId: payload.new.meeting_id,
            },
            eta: payload.new.eta_minutes || 0,
            context:
              payload.new.context || ContractorLocationContext.TRAVELING_TO_JOB,
          });
        }
      }
    )
    .subscribe();
}

export async function startTravelTracking(
  meetingId: string,
  contractorId: string,
  onLocationUpdate?: (location: {
    latitude: number;
    longitude: number;
    eta: number;
  }) => void
): Promise<JobContextLocationService> {
  try {
    const meeting = await getMeetingById(meetingId);
    if (!meeting) throw new Error('Meeting not found');
    if (!meeting.latitude || !meeting.longitude)
      throw new Error('Meeting location not set');
    await updateMeetingStatus(
      meetingId,
      'in_progress' as ContractorMeeting['status'],
      contractorId,
      'Contractor started traveling to meeting location'
    );
    await createMeetingUpdate({
      meetingId,
      updateType: 'contractor_enroute',
      message: 'Contractor is traveling to the meeting location',
      updatedBy: contractorId,
    });
    const locationService = new JobContextLocationService();
    await locationService.startJobTracking(
      contractorId,
      meeting.job_id || '',
      meetingId,
      { latitude: meeting.latitude, longitude: meeting.longitude },
      async (location, eta) => {
        if (onLocationUpdate)
          onLocationUpdate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            eta,
          });
      }
    );
    logger.info('Started travel tracking for meeting', {
      meetingId,
      contractorId,
    });
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
    await updateMeetingStatus(
      meetingId,
      'in_progress' as ContractorMeeting['status'],
      contractorId,
      'Contractor has arrived at meeting location'
    );
    await createMeetingUpdate({
      meetingId,
      updateType: 'contractor_arrived',
      message: 'Contractor has arrived at the meeting location',
      updatedBy: contractorId,
    });
    logger.info('Contractor marked as arrived', { meetingId, contractorId });
  } catch (error) {
    logger.error('Error marking contractor as arrived', error);
    throw error;
  }
}

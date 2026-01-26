import { supabase } from '../config/supabase';
import {
  ContractorMeeting,
  MeetingUpdate,
  LocationData,
  User,
  Job,
} from '@mintenance/types';
import { logger } from '../utils/logger';
import { ServiceErrorHandler } from '../utils/serviceErrorHandler';
import { JobContextLocationService, ContractorLocationContext } from './JobContextLocationService';

// Local type definitions
interface ContractorLocation {
  id: string;
  contractorId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  isActive: boolean;
  meetingId: string | null;
}

interface DatabaseMeetingRow {
  id: string;
  job_id: string;
  homeowner_id: string;
  contractor_id: string;
  scheduled_datetime: string;
  status: ContractorMeeting['status'];
  meeting_type: 'site_visit' | 'consultation' | 'work_session';
  latitude: number;
  longitude: number;
  address?: string;
  duration: number;
  notes?: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  created_at: string;
  updated_at: string;
  homeowner?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at?: string;
    updated_at?: string;
    phone?: string;
    profile_image_url?: string;
  };
  contractor?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at?: string;
    updated_at?: string;
    phone?: string;
    profile_image_url?: string;
    rating?: number;
  };
  job?: {
    id: string;
    title: string;
    description: string;
    location?: string;
    status: string;
    budget: number;
    created_at?: string;
    updated_at?: string;
  };
}

interface DatabaseMeetingUpdateRow {
  id: string;
  meeting_id: string;
  update_type: MeetingUpdate['updateType'];
  message: string;
  updated_by: string;
  timestamp: string;
  old_value: string | null;
  new_value: string | null;
}

interface DatabaseContractorLocationRow {
  id: string;
  contractor_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  is_active: boolean;
  meeting_id: string | null;
  eta_minutes?: number;
  context?: ContractorLocationContext;
}

interface RealtimePayload<T> {
  new?: T;
  old?: T;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

interface SupabaseError {
  message?: string;
  error_description?: string;
  details?: string;
  hint?: string;
  code?: string;
}

export class MeetingService {
  static async createMeeting(meetingData: {
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
      // Validation using ServiceErrorHandler
      ServiceErrorHandler.validateRequired(meetingData.jobId, 'Job ID', context);
      ServiceErrorHandler.validateRequired(meetingData.homeownerId, 'Homeowner ID', context);
      ServiceErrorHandler.validateRequired(meetingData.contractorId, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(meetingData.scheduledDateTime, 'Scheduled date time', context);

      const { data, error } = await supabase
        .from('contractor_meetings')
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

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      return this.mapDatabaseToMeeting(data);
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to create meeting');
    }

    return result.data;
  }

  static async getMeetingById(meetingId: string): Promise<ContractorMeeting | null> {
    try {
      const { data, error } = await supabase
        .from('contractor_meetings')
        .select(`
          *,
          homeowner:homeowner_id (
            id, first_name, last_name, email, phone, profile_image_url
          ),
          contractor:contractor_id (
            id, first_name, last_name, email, phone, profile_image_url, rating
          ),
          job:job_id (
            id, title, description, budget, status
          )
        `)
        .eq('id', meetingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw this.normalizeSupabaseError(error, 'Failed to fetch meeting');
      }

      return data ? this.mapDatabaseToMeeting(data) : null;
    } catch (error) {
      logger.error('Error fetching meeting:', error);
      throw error;
    }
  }

  static async getMeetingsForUser(
    userId: string,
    role: 'homeowner' | 'contractor',
    status?: string
  ): Promise<ContractorMeeting[]> {
    try {
      const roleColumn = role === 'homeowner' ? 'homeowner_id' : 'contractor_id';

      let query = supabase
        .from('contractor_meetings')
        .select(`
          *,
          homeowner:homeowner_id (
            id, first_name, last_name, email, phone, profile_image_url
          ),
          contractor:contractor_id (
            id, first_name, last_name, email, phone, profile_image_url, rating
          ),
          job:job_id (
            id, title, description, budget, status
          )
        `)
        .eq(roleColumn, userId)
        .order('scheduled_datetime', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw this.normalizeSupabaseError(error, 'Failed to fetch meetings');
      return (data || []).map(this.mapDatabaseToMeeting);
    } catch (error) {
      logger.error('Error fetching user meetings:', error);
      throw error;
    }
  }

  static async updateMeetingStatus(
    meetingId: string,
    status: ContractorMeeting['status'],
    updatedBy: string,
    notes?: string
  ): Promise<ContractorMeeting> {
    try {
      const { data, error } = await supabase
        .from('contractor_meetings')
        .update({
          status,
          notes: notes || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId)
        .select()
        .single();

      if (error) throw this.normalizeSupabaseError(error, 'Failed to update meeting status');
      if (!data) throw new Error('Failed to update meeting');

      // Log the update
      await this.createMeetingUpdate({
        meetingId,
        updateType: 'status_change',
        message: `Meeting status changed to ${status}`,
        updatedBy,
        oldValue: undefined,
        newValue: status,
      });

      return this.mapDatabaseToMeeting(data);
    } catch (error) {
      logger.error('Error updating meeting status:', error);
      throw error;
    }
  }

  static async rescheduleMeeting(
    meetingId: string,
    newDateTime: string,
    updatedBy: string,
    reason?: string
  ): Promise<ContractorMeeting> {
    try {
      // First get the current meeting to log old datetime
      const currentMeeting = await this.getMeetingById(meetingId);

      const { data, error } = await supabase
        .from('contractor_meetings')
        .update({
          scheduled_datetime: newDateTime,
          status: 'rescheduled',
          notes: reason || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId)
        .select()
        .single();

      if (error) throw this.normalizeSupabaseError(error, 'Failed to reschedule meeting');
      if (!data) throw new Error('Failed to reschedule meeting');

      // Log the reschedule
      await this.createMeetingUpdate({
        meetingId,
        updateType: 'rescheduled',
        message: reason || 'Meeting rescheduled',
        updatedBy,
        oldValue: currentMeeting?.scheduled_datetime,
        newValue: newDateTime,
      });

      return this.mapDatabaseToMeeting(data);
    } catch (error) {
      logger.error('Error rescheduling meeting:', error);
      throw error;
    }
  }

  static async updateContractorLocation(
    contractorId: string,
    location: LocationData,
    meetingId?: string
  ): Promise<ContractorLocation> {
    try {
      const { data, error } = await supabase
        .from('contractor_locations')
        .upsert({
          contractor_id: contractorId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: 10, // Default accuracy
          timestamp: new Date().toISOString(),
          is_active: true,
          meeting_id: meetingId || null,
        })
        .select()
        .single();

      if (error) throw this.normalizeSupabaseError(error, 'Failed to update contractor location');
      if (!data) throw new Error('Failed to update contractor location');

      return {
        id: data.id,
        contractorId: data.contractor_id,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: data.timestamp,
        isActive: data.is_active,
        meetingId: data.meeting_id,
      };
    } catch (error) {
      logger.error('Error updating contractor location:', error);
      throw error;
    }
  }

  static async getContractorLocation(contractorId: string): Promise<ContractorLocation | null> {
    try {
      const { data, error } = await supabase
        .from('contractor_locations')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('is_active', true)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw this.normalizeSupabaseError(error, 'Failed to fetch contractor location');
      }

      return data ? {
        id: data.id,
        contractorId: data.contractor_id,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: data.timestamp,
        isActive: data.is_active,
        meetingId: data.meeting_id,
      } : null;
    } catch (error) {
      logger.error('Error fetching contractor location:', error);
      throw error;
    }
  }

  static async createMeetingUpdate(updateData: {
    meetingId: string;
    updateType: MeetingUpdate['updateType'];
    message: string;
    updatedBy: string;
    oldValue?: unknown;
    newValue?: unknown;
  }): Promise<MeetingUpdate> {
    try {
      const { data, error } = await supabase
        .from('meeting_updates')
        .insert({
          meeting_id: updateData.meetingId,
          update_type: updateData.updateType,
          message: updateData.message,
          updated_by: updateData.updatedBy,
          old_value: updateData.oldValue ? JSON.stringify(updateData.oldValue) : null,
          new_value: updateData.newValue ? JSON.stringify(updateData.newValue) : null,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw this.normalizeSupabaseError(error, 'Failed to create meeting update');
      if (!data) throw new Error('Failed to create meeting update');

      return {
        id: data.id,
        meetingId: data.meeting_id,
        updateType: data.update_type,
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

  static async getMeetingUpdates(meetingId: string): Promise<MeetingUpdate[]> {
    try {
      const { data, error } = await supabase
        .from('meeting_updates')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: false });

      if (error) throw this.normalizeSupabaseError(error, 'Failed to fetch meeting updates');

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

  // Real-time location tracking
  static subscribeToContractorLocation(
    contractorId: string,
    callback: (location: ContractorLocation | null) => void
  ) {
    return supabase
      .channel(`contractor_location_${contractorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contractor_locations',
          filter: `contractor_id=eq.${contractorId}`,
        },
        (payload: RealtimePayload<DatabaseContractorLocationRow>) => {
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

  // Real-time meeting updates
  static subscribeToMeetingUpdates(
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
        async (payload: RealtimePayload<DatabaseMeetingRow>) => {
          if (payload.new) {
            const meeting = await this.getMeetingById(payload.new.id);
            callback(meeting);
          }
        }
      )
      .subscribe();
  }

  /**
   * Start tracking contractor travel to meeting location
   * Called when contractor taps "Start Traveling" button
   */
  static async startTravelTracking(
    meetingId: string,
    contractorId: string,
    onLocationUpdate?: (location: { latitude: number; longitude: number; eta: number }) => void
  ): Promise<JobContextLocationService> {
    try {
      const meeting = await this.getMeetingById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (!meeting.latitude || !meeting.longitude) {
        throw new Error('Meeting location not set');
      }

      // Update meeting status to indicate contractor is traveling
      await this.updateMeetingStatus(
        meetingId,
        'in_progress' as ContractorMeeting['status'],
        contractorId,
        'Contractor started traveling to meeting location'
      );

      // Create meeting update
      await this.createMeetingUpdate({
        meetingId,
        updateType: 'contractor_enroute',
        message: 'Contractor is traveling to the meeting location',
        updatedBy: contractorId,
      });

      // Start location tracking service
      const locationService = new JobContextLocationService();
      await locationService.startJobTracking(
        contractorId,
        meeting.job_id || '',
        meetingId,
        {
          latitude: meeting.latitude,
          longitude: meeting.longitude,
        },
        async (location, eta) => {
          // Notify via callback if provided
          if (onLocationUpdate) {
            onLocationUpdate({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              eta,
            });
          }
        }
      );

      logger.info('Started travel tracking for meeting', {
        meetingId,
        contractorId,
        destination: { latitude: meeting.latitude, longitude: meeting.longitude },
      });

      return locationService;
    } catch (error) {
      logger.error('Error starting travel tracking', error);
      throw error;
    }
  }

  /**
   * Mark contractor as arrived at meeting location
   */
  static async markArrived(
    meetingId: string,
    contractorId: string,
    locationService: JobContextLocationService
  ): Promise<void> {
    try {
      const meeting = await this.getMeetingById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Mark as arrived in location service
      await locationService.markArrived(
        meeting.job_id || '',
        meetingId
      );

      // Update meeting status
      await this.updateMeetingStatus(
        meetingId,
        'in_progress' as ContractorMeeting['status'],
        contractorId,
        'Contractor has arrived at meeting location'
      );

      // Create meeting update
      await this.createMeetingUpdate({
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

  /**
   * Subscribe to contractor location updates during travel
   * Enhanced version with ETA and context
   */
  static subscribeToContractorTravelLocation(
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
        (payload: RealtimePayload<DatabaseContractorLocationRow>) => {
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
              context: payload.new.context || ContractorLocationContext.TRAVELING_TO_JOB,
            });
          }
        }
      )
      .subscribe();
  }

  private static normalizeSupabaseError(error: Error | unknown, fallbackMessage: string): Error {
    if (!error) {
      return new Error(fallbackMessage);
    }

    if (error instanceof Error) {
      return error;
    }

    const supabaseError = error as SupabaseError;
    const messageCandidate = [
      typeof supabaseError.message === 'string' && supabaseError.message.trim(),
      typeof supabaseError.error_description === 'string' && supabaseError.error_description.trim(),
      typeof supabaseError.details === 'string' && supabaseError.details.trim(),
      typeof supabaseError.hint === 'string' && supabaseError.hint.trim(),
    ].find((value) => value);

    return new Error((messageCandidate as string) || fallbackMessage);
  }

  private static mapDatabaseToMeeting(data: DatabaseMeetingRow): ContractorMeeting {
    return {
      id: data.id,
      job_id: data.job_id,
      homeowner_id: data.homeowner_id,
      contractor_id: data.contractor_id,
      scheduled_datetime: data.scheduled_datetime,
      status: data.status,
      meeting_type: data.meeting_type,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      duration: data.duration,
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Include expanded details if available
      homeowner: data.homeowner ? {
        id: data.homeowner.id,
        email: data.homeowner.email,
        first_name: data.homeowner.first_name,
        last_name: data.homeowner.last_name,
        role: 'homeowner' as const,
        created_at: data.homeowner.created_at || new Date().toISOString(),
        updated_at: data.homeowner.updated_at || new Date().toISOString(),
        phone: data.homeowner.phone,
        profile_image_url: data.homeowner.profile_image_url,
      } : undefined,
      contractor: data.contractor ? {
        id: data.contractor.id,
        email: data.contractor.email,
        first_name: data.contractor.first_name,
        last_name: data.contractor.last_name,
        role: 'contractor' as const,
        created_at: data.contractor.created_at || new Date().toISOString(),
        updated_at: data.contractor.updated_at || new Date().toISOString(),
        phone: data.contractor.phone,
        profile_image_url: data.contractor.profile_image_url,
        rating: data.contractor.rating,
      } : undefined,
      job: data.job ? {
        id: data.job.id,
        title: data.job.title,
      } : undefined,
    };
  }
}

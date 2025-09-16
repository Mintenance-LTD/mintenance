import { supabase } from '../config/supabase';
import {
  ContractorMeeting,
  MeetingUpdate,
  ContractorLocation,
  LocationData,
} from '../types';
import { logger } from '../utils/logger';

export class MeetingService {
  static async createMeeting(meetingData: {
    jobId: string;
    homeownerId: string;
    contractorId: string;
    scheduledDateTime: string;
    meetingType: 'site_visit' | 'consultation' | 'work_session';
    location: LocationData;
    duration: number;
    notes?: string;
  }): Promise<ContractorMeeting> {
    try {
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

      if (error) throw new Error(error.message);
      if (!data) throw new Error('Failed to create meeting');

      return this.mapDatabaseToMeeting(data);
    } catch (error) {
      logger.error('Error creating meeting:', error);
      throw error;
    }
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
        throw error;
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

      if (error) throw error;
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

      if (error) throw error;
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

      if (error) throw error;
      if (!data) throw new Error('Failed to reschedule meeting');

      // Log the reschedule
      await this.createMeetingUpdate({
        meetingId,
        updateType: 'schedule_change',
        message: reason || 'Meeting rescheduled',
        updatedBy,
        oldValue: currentMeeting?.scheduledDateTime,
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

      if (error) throw error;
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
        throw error;
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
    oldValue?: any;
    newValue?: any;
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

      if (error) throw error;
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

      if (error) throw error;

      return (data || []).map((update: any) => ({
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
        (payload: any) => {
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
        async (payload: any) => {
          if (payload.new) {
            const meeting = await this.getMeetingById(payload.new.id);
            callback(meeting);
          }
        }
      )
      .subscribe();
  }

  private static mapDatabaseToMeeting(data: any): ContractorMeeting {
    return {
      id: data.id,
      jobId: data.job_id,
      homeownerId: data.homeowner_id,
      contractorId: data.contractor_id,
      scheduledDateTime: data.scheduled_datetime,
      status: data.status,
      meetingType: data.meeting_type,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
      },
      duration: data.duration,
      notes: data.notes,
      estimatedArrival: data.estimated_arrival,
      actualArrival: data.actual_arrival,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // Include expanded details if available
      homeowner: data.homeowner ? {
        id: data.homeowner.id,
        email: data.homeowner.email,
        first_name: data.homeowner.first_name,
        last_name: data.homeowner.last_name,
        role: 'homeowner',
        created_at: data.homeowner.created_at || new Date().toISOString(),
        updated_at: data.homeowner.updated_at || new Date().toISOString(),
        phone: data.homeowner.phone,
        profileImageUrl: data.homeowner.profile_image_url,
      } : undefined,
      contractor: data.contractor ? {
        id: data.contractor.id,
        email: data.contractor.email,
        first_name: data.contractor.first_name,
        last_name: data.contractor.last_name,
        role: 'contractor',
        created_at: data.contractor.created_at || new Date().toISOString(),
        updated_at: data.contractor.updated_at || new Date().toISOString(),
        phone: data.contractor.phone,
        profileImageUrl: data.contractor.profile_image_url,
        rating: data.contractor.rating,
      } : undefined,
      job: data.job ? {
        id: data.job.id,
        title: data.job.title,
        description: data.job.description,
        location: data.job.location || '',
        homeowner_id: data.homeowner_id,
        contractor_id: data.contractor_id,
        status: data.job.status,
        budget: data.job.budget,
        created_at: data.job.created_at || new Date().toISOString(),
        updated_at: data.job.updated_at || new Date().toISOString(),
      } : undefined,
    };
  }
}
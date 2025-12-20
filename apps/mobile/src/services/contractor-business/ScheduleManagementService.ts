/**
 * Schedule Management Service
 *
 * Handles contractor scheduling, availability management, and calendar operations.
 * Part of the domain-separated contractor business suite.
 *
 * @filesize Target: <500 lines
 * @compliance Architecture principles - Domain separation, single responsibility
 */

import { supabase } from '../../config/supabase';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { logger } from '../../utils/logger';
import { ContractorSchedule } from './types';

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  jobId?: string;
  jobTitle?: string;
}

export interface AvailabilityUpdate {
  date: string;
  timeSlots: TimeSlot[];
  recurringPattern?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurringEndDate?: string;
}

export interface ScheduleConflict {
  conflictType: 'overlap' | 'double_booking' | 'insufficient_time';
  existingJobId: string;
  newJobId: string;
  conflictTime: {
    start: string;
    end: string;
  };
  resolution?: string;
}

export interface WorkingHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  breakStart?: string;
  breakEnd?: string;
  available: boolean;
}

/**
 * Schedule Management Service
 *
 * Provides comprehensive scheduling functionality for contractors including
 * availability management, conflict detection, and calendar integration.
 */
export class ScheduleManagementService {
  /**
   * Update contractor availability
   */
  static async updateAvailability(
    contractorId: string,
    availabilityData: AvailabilityUpdate
  ): Promise<ContractorSchedule> {
    const context = {
      service: 'ScheduleManagementService',
      method: 'updateAvailability',
      userId: contractorId,
      params: { date: availabilityData.date },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(availabilityData.date, 'Date', context);
      ServiceErrorHandler.validateRequired(availabilityData.timeSlots, 'Time slots', context);

      // Check for existing schedule entry
      const { data: existingSchedule, error: fetchError } = await supabase
        .from('contractor_schedules')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('date', availabilityData.date)
        .single();

      let scheduleData;

      if (existingSchedule) {
        // Update existing schedule
        const { data: updatedSchedule, error: updateError } = await supabase
          .from('contractor_schedules')
          .update({
            time_slots: availabilityData.timeSlots,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSchedule.id)
          .select()
          .single();

        if (updateError) {
          throw ServiceErrorHandler.handleDatabaseError(updateError, context);
        }

        scheduleData = updatedSchedule;
      } else {
        // Create new schedule entry
        const { data: newSchedule, error: createError } = await supabase
          .from('contractor_schedules')
          .insert([
            {
              contractor_id: contractorId,
              date: availabilityData.date,
              time_slots: availabilityData.timeSlots,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ])
          .select()
          .single();

        if (createError) {
          throw ServiceErrorHandler.handleDatabaseError(createError, context);
        }

        scheduleData = newSchedule;
      }

      // Handle recurring patterns if specified
      if (availabilityData.recurringPattern && availabilityData.recurringPattern !== 'none') {
        await this.createRecurringSchedule(
          contractorId,
          availabilityData.date,
          availabilityData.timeSlots,
          availabilityData.recurringPattern,
          availabilityData.recurringEndDate
        );
      }

      return scheduleData as ContractorSchedule;
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to update availability');
    }

    return result.data;
  }

  /**
   * Get contractor schedule for a specific date range
   */
  static async getSchedule(
    contractorId: string,
    startDate: string,
    endDate: string
  ): Promise<ContractorSchedule[]> {
    const context = {
      service: 'ScheduleManagementService',
      method: 'getSchedule',
      userId: contractorId,
      params: { startDate, endDate },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(startDate, 'Start date', context);
      ServiceErrorHandler.validateRequired(endDate, 'End date', context);

      const { data: schedules, error } = await supabase
        .from('contractor_schedules')
        .select('*')
        .eq('contractor_id', contractorId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      return schedules as ContractorSchedule[] || [];
    }, context);

    if (!result.success) {
      return [];
    }

    return result.data || [];
  }

  /**
   * Check for scheduling conflicts
   */
  static async checkConflicts(
    contractorId: string,
    proposedJobId: string,
    startTime: string,
    endTime: string
  ): Promise<ScheduleConflict[]> {
    const context = {
      service: 'ScheduleManagementService',
      method: 'checkConflicts',
      userId: contractorId,
      params: { proposedJobId, startTime, endTime },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(proposedJobId, 'Proposed job ID', context);
      ServiceErrorHandler.validateRequired(startTime, 'Start time', context);
      ServiceErrorHandler.validateRequired(endTime, 'End time', context);

      const proposedStart = new Date(startTime);
      const proposedEnd = new Date(endTime);
      const date = proposedStart.toISOString().split('T')[0];

      // Get existing schedule for the date
      const { data: schedule, error } = await supabase
        .from('contractor_schedules')
        .select('time_slots')
        .eq('contractor_id', contractorId)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      const conflicts: ScheduleConflict[] = [];

      if (schedule?.time_slots) {
        const timeSlots = schedule.time_slots as TimeSlot[];

        timeSlots.forEach((slot) => {
          if (slot.jobId && slot.jobId !== proposedJobId) {
            const slotStart = new Date(`${date}T${slot.start}`);
            const slotEnd = new Date(`${date}T${slot.end}`);

            // Check for overlap
            if (
              (proposedStart < slotEnd && proposedEnd > slotStart) ||
              (slotStart < proposedEnd && slotEnd > proposedStart)
            ) {
              conflicts.push({
                conflictType: 'overlap',
                existingJobId: slot.jobId,
                newJobId: proposedJobId,
                conflictTime: {
                  start: Math.max(proposedStart.getTime(), slotStart.getTime()).toString(),
                  end: Math.min(proposedEnd.getTime(), slotEnd.getTime()).toString(),
                },
                resolution: 'Consider rescheduling one of the jobs',
              });
            }
          }
        });
      }

      return conflicts;
    }, context);

    if (!result.success) {
      return [];
    }

    return result.data || [];
  }

  /**
   * Set default working hours for a contractor
   */
  static async setWorkingHours(
    contractorId: string,
    workingHours: WorkingHours[]
  ): Promise<void> {
    const context = {
      service: 'ScheduleManagementService',
      method: 'setWorkingHours',
      userId: contractorId,
      params: { workingHours: workingHours.length },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(workingHours, 'Working hours', context);

      // Validate working hours format
      workingHours.forEach((hours, index) => {
        if (hours.dayOfWeek < 0 || hours.dayOfWeek > 6) {
          throw new Error(`Invalid day of week at index ${index}: ${hours.dayOfWeek}`);
        }

        if (!this.isValidTimeFormat(hours.startTime) || !this.isValidTimeFormat(hours.endTime)) {
          throw new Error(`Invalid time format at index ${index}`);
        }
      });

      // Store working hours in contractor profile
      const { error } = await supabase
        .from('contractor_profiles')
        .update({
          working_hours: workingHours,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', contractorId);

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      logger.info('Working hours updated successfully', { contractorId });
    }, context);

    if (!result.success) {
      throw new Error('Failed to set working hours');
    }
  }

  /**
   * Get available time slots for a specific date
   */
  static async getAvailableSlots(
    contractorId: string,
    date: string,
    jobDuration: number = 60 // minutes
  ): Promise<TimeSlot[]> {
    const context = {
      service: 'ScheduleManagementService',
      method: 'getAvailableSlots',
      userId: contractorId,
      params: { date, jobDuration },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(date, 'Date', context);

      // Get contractor's working hours
      const { data: contractorProfile, error: profileError } = await supabase
        .from('contractor_profiles')
        .select('working_hours')
        .eq('user_id', contractorId)
        .single();

      if (profileError) {
        throw ServiceErrorHandler.handleDatabaseError(profileError, context);
      }

      // Get existing schedule for the date
      const { data: schedule, error: scheduleError } = await supabase
        .from('contractor_schedules')
        .select('time_slots')
        .eq('contractor_id', contractorId)
        .eq('date', date)
        .single();

      if (scheduleError && scheduleError.code !== 'PGRST116') {
        throw ServiceErrorHandler.handleDatabaseError(scheduleError, context);
      }

      // Calculate available slots based on working hours and existing bookings
      const dayOfWeek = new Date(date).getDay();
      const workingHours = contractorProfile?.working_hours || [];
      const dayHours = workingHours.find((wh: WorkingHours) => wh.dayOfWeek === dayOfWeek);

      if (!dayHours || !dayHours.available) {
        return [];
      }

      const existingSlots = (schedule?.time_slots as TimeSlot[]) || [];
      const availableSlots = this.calculateAvailableSlots(
        dayHours,
        existingSlots,
        jobDuration
      );

      return availableSlots;
    }, context);

    if (!result.success) {
      return [];
    }

    return result.data || [];
  }

  /**
   * Book a job in the schedule
   */
  static async bookJob(
    contractorId: string,
    jobId: string,
    jobTitle: string,
    startTime: string,
    endTime: string
  ): Promise<void> {
    const context = {
      service: 'ScheduleManagementService',
      method: 'bookJob',
      userId: contractorId,
      params: { jobId, startTime, endTime },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(jobId, 'Job ID', context);
      ServiceErrorHandler.validateRequired(startTime, 'Start time', context);
      ServiceErrorHandler.validateRequired(endTime, 'End time', context);

      // Check for conflicts first
      const conflicts = await this.checkConflicts(contractorId, jobId, startTime, endTime);
      if (conflicts.length > 0) {
        throw new Error(`Scheduling conflict detected: ${conflicts[0].conflictType}`);
      }

      const date = new Date(startTime).toISOString().split('T')[0];
      const startTimeOnly = new Date(startTime).toTimeString().substr(0, 5);
      const endTimeOnly = new Date(endTime).toTimeString().substr(0, 5);

      // Get or create schedule for the date
      let { data: schedule, error: fetchError } = await supabase
        .from('contractor_schedules')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('date', date)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw ServiceErrorHandler.handleDatabaseError(fetchError, context);
      }

      const newSlot: TimeSlot = {
        start: startTimeOnly,
        end: endTimeOnly,
        available: false,
        jobId,
        jobTitle,
      };

      if (schedule) {
        // Update existing schedule
        const existingSlots = (schedule.time_slots as TimeSlot[]) || [];
        const updatedSlots = [...existingSlots, newSlot];

        const { error: updateError } = await supabase
          .from('contractor_schedules')
          .update({
            time_slots: updatedSlots,
            updated_at: new Date().toISOString(),
          })
          .eq('id', schedule.id);

        if (updateError) {
          throw ServiceErrorHandler.handleDatabaseError(updateError, context);
        }
      } else {
        // Create new schedule
        const { error: createError } = await supabase
          .from('contractor_schedules')
          .insert([
            {
              contractor_id: contractorId,
              date,
              time_slots: [newSlot],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ]);

        if (createError) {
          throw ServiceErrorHandler.handleDatabaseError(createError, context);
        }
      }

      logger.info('Job booked successfully', { contractorId, jobId, date });
    }, context);

    if (!result.success) {
      throw new Error('Failed to book job');
    }
  }

  /**
   * Cancel a booked job
   */
  static async cancelJob(contractorId: string, jobId: string, date: string): Promise<void> {
    const context = {
      service: 'ScheduleManagementService',
      method: 'cancelJob',
      userId: contractorId,
      params: { jobId, date },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(jobId, 'Job ID', context);
      ServiceErrorHandler.validateRequired(date, 'Date', context);

      const { data: schedule, error: fetchError } = await supabase
        .from('contractor_schedules')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('date', date)
        .single();

      if (fetchError) {
        throw ServiceErrorHandler.handleDatabaseError(fetchError, context);
      }

      if (schedule) {
        const existingSlots = (schedule.time_slots as TimeSlot[]) || [];
        const updatedSlots = existingSlots.filter(slot => slot.jobId !== jobId);

        const { error: updateError } = await supabase
          .from('contractor_schedules')
          .update({
            time_slots: updatedSlots,
            updated_at: new Date().toISOString(),
          })
          .eq('id', schedule.id);

        if (updateError) {
          throw ServiceErrorHandler.handleDatabaseError(updateError, context);
        }
      }

      logger.info('Job cancelled successfully', { contractorId, jobId, date });
    }, context);

    if (!result.success) {
      throw new Error('Failed to cancel job');
    }
  }

  /**
   * Private helper methods
   */
  private static async createRecurringSchedule(
    contractorId: string,
    startDate: string,
    timeSlots: TimeSlot[],
    pattern: 'daily' | 'weekly' | 'monthly',
    endDate?: string
  ): Promise<void> {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default

    const dates: string[] = [];
    const current = new Date(start);

    while (current <= end) {
      switch (pattern) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }

      if (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
      }
    }

    // Create schedule entries for all dates
    const scheduleEntries = dates.map(date => ({
      contractor_id: contractorId,
      date,
      time_slots: timeSlots,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (scheduleEntries.length > 0) {
      const { error } = await supabase
        .from('contractor_schedules')
        .insert(scheduleEntries);

      if (error) {
        logger.error('Failed to create recurring schedule', error);
      }
    }
  }

  private static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private static calculateAvailableSlots(
    workingHours: WorkingHours,
    existingSlots: TimeSlot[],
    jobDuration: number
  ): TimeSlot[] {
    const availableSlots: TimeSlot[] = [];
    const startTime = this.timeToMinutes(workingHours.startTime);
    const endTime = this.timeToMinutes(workingHours.endTime);

    // Create 30-minute intervals throughout the day
    for (let time = startTime; time + jobDuration <= endTime; time += 30) {
      const slotStart = this.minutesToTime(time);
      const slotEnd = this.minutesToTime(time + jobDuration);

      // Check if this slot conflicts with existing bookings
      const hasConflict = existingSlots.some(existing => {
        const existingStart = this.timeToMinutes(existing.start);
        const existingEnd = this.timeToMinutes(existing.end);
        return !(time + jobDuration <= existingStart || time >= existingEnd);
      });

      if (!hasConflict) {
        availableSlots.push({
          start: slotStart,
          end: slotEnd,
          available: true,
        });
      }
    }

    return availableSlots;
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

export default ScheduleManagementService;
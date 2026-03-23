/**
 * Time Tracking Service
 *
 * Read operations use direct Supabase queries; writes use mobileApiClient
 * for server-side orchestration.
 */

import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';

export interface TimeEntry {
  id: string;
  job_id?: string;
  job_title?: string;
  task_description: string;
  date: string;
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  hourly_rate?: number;
  is_billable: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateTimeEntryData {
  jobId?: string;
  taskDescription: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  hourlyRate?: number;
  isBillable?: boolean;
  notes?: string;
}

export class TimeTrackingService {
  static async getEntries(): Promise<TimeEntry[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        logger.error('Failed to fetch time entries: not authenticated');
        return [];
      }

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('contractor_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // Table may not exist yet — return empty array gracefully
        logger.error('Failed to fetch time entries', error.message);
        return [];
      }

      return (data ?? []) as unknown as TimeEntry[];
    } catch (error) {
      logger.error('Failed to fetch time entries', error);
      return [];
    }
  }

  static async createEntry(data: CreateTimeEntryData): Promise<TimeEntry> {
    const response = await mobileApiClient.post<{ entry: TimeEntry }>(
      '/api/contractor/time-tracking',
      data
    );
    if (!response.entry) throw new Error('No time entry returned from API');
    return response.entry;
  }

  static async updateEntry(
    entryId: string,
    data: Partial<CreateTimeEntryData>
  ): Promise<TimeEntry> {
    const response = await mobileApiClient.patch<{ entry: TimeEntry }>(
      '/api/contractor/time-tracking',
      { id: entryId, ...data }
    );
    if (!response.entry) throw new Error('No time entry returned from API');
    return response.entry;
  }

  static async deleteEntry(entryId: string): Promise<void> {
    await mobileApiClient.delete(
      `/api/contractor/time-tracking?id=${encodeURIComponent(entryId)}`
    );
  }

  static async getEntriesByJob(jobId: string): Promise<TimeEntry[]> {
    try {
      const entries = await this.getEntries();
      return entries.filter((e) => e.job_id === jobId);
    } catch (error) {
      logger.error('Failed to fetch time entries by job', error);
      return [];
    }
  }

  static async getTotalHours(
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const entries = await this.getEntries();
    const filtered = entries.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });
    return filtered.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;
  }
}

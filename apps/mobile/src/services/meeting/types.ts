import { ContractorMeeting, MeetingUpdate, LocationData } from '@mintenance/types';
import { ContractorLocationContext } from '../JobContextLocationService';

export interface ContractorLocation {
  id: string;
  contractorId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  isActive: boolean;
  meetingId: string | null;
}

export interface DatabaseMeetingRow {
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

export interface DatabaseMeetingUpdateRow {
  id: string;
  meeting_id: string;
  update_type: MeetingUpdate['updateType'];
  message: string;
  updated_by: string;
  timestamp: string;
  old_value: string | null;
  new_value: string | null;
}

export interface DatabaseContractorLocationRow {
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

export interface RealtimePayload<T> {
  new?: T;
  old?: T;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface SupabaseError {
  message?: string;
  error_description?: string;
  details?: string;
  hint?: string;
  code?: string;
}

export type { ContractorMeeting, MeetingUpdate, LocationData };

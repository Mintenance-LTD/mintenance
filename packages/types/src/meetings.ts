import type { User } from './user';

// Meeting types for scheduling
export interface ContractorMeeting {
  id: string;
  job_id?: string;
  contractor_id: string;
  homeowner_id?: string;
  meeting_type: 'site_visit' | 'consultation' | 'work_session';
  scheduled_datetime: string;
  duration?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  latitude?: number;
  longitude?: number;
  address?: string;
  notes?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  contractor?: User;
  homeowner?: User;
  job?: {
    id: string;
    title: string;
  };
}

export interface MeetingUpdate {
  id: string;
  meetingId: string;
  updateType: 'status_change' | 'rescheduled' | 'location_update' | 'contractor_enroute' |
    'contractor_arrived' | 'meeting_started' | 'meeting_completed' | 'notes_added' |
    'cancelled' | 'no_show';
  message: string;
  updatedBy: string;
  timestamp: string;
  oldValue?: unknown;
  newValue?: unknown;
}

// Appointment matching DB: public.appointments
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type LocationType = 'onsite' | 'remote' | 'phone';

export interface Appointment {
  id: string;
  contractor_id: string;
  client_id?: string;
  job_id?: string;
  title: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  location_type: LocationType;
  location_address?: string;
  notes?: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
  // Populated relations
  contractor?: User;
  client?: User;
  job?: { id: string; title: string };
}

// ContractorAvailability matching DB: public.contractor_availability
export interface ContractorAvailability {
  id: string;
  contractor_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

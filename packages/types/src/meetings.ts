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

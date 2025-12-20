/**
 * Event types for scheduling calendar
 */

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date | string;
  type: 'job' | 'maintenance' | 'inspection';
  status?: string;
}

export interface JobWithContract {
  id: string;
  title: string | null;
  created_at: string;
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
  status: string;
  contractor?: unknown;
  homeowner?: unknown;
  contract?: {
    start_date: string | null;
    end_date: string | null;
    status: string;
    contractor_signed_at: string | null;
    homeowner_signed_at: string | null;
  } | null;
  isViewed?: boolean;
  hasBid?: boolean;
}

export interface Meeting {
  id: string;
  scheduled_datetime: string;
  meeting_type: 'site_visit' | 'consultation' | 'work_session';
  status: string;
  contractor?: unknown;
  job?: {
    title: string;
  } | null;
}

export interface SubscriptionWithName {
  id: string;
  name?: string;
  next_billing_date: string | null;
  status: string;
  created_at: string;
}


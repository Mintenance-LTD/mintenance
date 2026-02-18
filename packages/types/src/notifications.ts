// Notification types matching DB: public.notifications
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string; // DB: nullable TEXT
  data?: Record<string, unknown>; // DB column name: data JSONB
  metadata?: Record<string, unknown>; // Alias for data (backward compat)
  read: boolean;
  read_at?: string; // DB: TIMESTAMPTZ
  created_at: string;
  action_url?: string;
}

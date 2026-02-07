// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

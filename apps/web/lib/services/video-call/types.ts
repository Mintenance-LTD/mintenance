import type { VideoCall } from '@mintenance/types';

export type SupabaseVideoCallProfile = {
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
};

export type SupabaseVideoCallJob = {
  title?: string | null;
  category?: string | null;
};

export type VideoCallRow = {
  id: string;
  job_id?: string | null;
  initiator_id: string;
  participant_id: string;
  title: string;
  description?: string | null;
  status: VideoCall['status'];
  scheduled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  duration?: number | null;
  recording_url?: string | null;
  room_id?: string | null;
  access_token?: string | null;
  type: VideoCall['type'];
  priority: VideoCall['priority'];
  created_at: string;
  updated_at: string;
  initiator?: SupabaseVideoCallProfile | null;
  participant?: SupabaseVideoCallProfile | null;
  job?: SupabaseVideoCallJob | null;
};

export type VideoCallFallbackParams = Partial<{
  jobId: string;
  participantId: string;
  title: string;
  description?: string;
  scheduledAt?: string;
  type: VideoCall['type'];
}>;

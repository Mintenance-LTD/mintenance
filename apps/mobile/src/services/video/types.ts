/** Database row interface for video_calls table (snake_case). */
export interface DatabaseVideoCallRow {
  id: string;
  job_id: string;
  participants: string[];
  initiator_id: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'failed';
  start_time?: string | null;
  end_time?: string | null;
  scheduled_time?: string | null;
  duration?: number | null;
  recording_url?: string | null;
  recording_enabled: boolean;
  screen_sharing_enabled: boolean;
  call_quality?: 'excellent' | 'good' | 'fair' | 'poor' | null;
  metadata?: {
    callPurpose?: 'consultation' | 'progress_update' | 'problem_discussion' | 'final_walkthrough';
    notes?: string;
    issues?: string[];
    resolution?: string;
    followUpRequired?: boolean;
    recordingStartedBy?: string;
    recordingStartedAt?: string;
    cancelledBy?: string;
    cancellationReason?: string;
    cancelledAt?: string;
    endedBy?: string;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
}

/** Notification payload for video call events. */
export interface VideoCallNotificationData {
  type: 'system';
  action: string;
  callId: string;
  jobId: string;
}

export interface VideoCall {
  id: string;
  jobId: string;
  participants: string[];
  initiatorId: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'failed';
  startTime?: string;
  endTime?: string;
  scheduledTime?: string;
  /** Duration in seconds. */
  duration?: number;
  recordingUrl?: string;
  recordingEnabled: boolean;
  screenSharingEnabled: boolean;
  callQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  metadata?: {
    callPurpose: 'consultation' | 'progress_update' | 'problem_discussion' | 'final_walkthrough';
    notes?: string;
    issues?: string[];
    resolution?: string;
    followUpRequired?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface CallParticipant {
  userId: string;
  role: 'homeowner' | 'contractor';
  status: 'invited' | 'joined' | 'left' | 'declined';
  joinedAt?: string;
  leftAt?: string;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
}

export interface CallSession {
  callId: string;
  sessionToken: string;
  sdpOffer?: string;
  sdpAnswer?: string;
  iceServers: RTCIceServer[];
  mediaConstraints: {
    audio: boolean;
    video: boolean;
    screenShare?: boolean;
  };
  bandwidth?: {
    audio: number;
    video: number;
  };
}

export interface CallStatistics {
  callId: string;
  duration: number;
  averageQuality: string;
  packetsLost: number;
  bandwidthUsed: number;
  reconnections: number;
  participantStats: {
    userId: string;
    audioQuality: number;
    videoQuality: number;
    connectionTime: number;
  }[];
}

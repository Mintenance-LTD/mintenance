// Enhanced Video call types
export interface VideoCall {
  id: string;
  jobId?: string;
  initiatorId: string;
  participantId: string;
  title: string;
  description?: string;
  status: 'pending' | 'scheduled' | 'active' | 'ended' | 'cancelled' | 'missed';
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number; // in seconds
  recordingUrl?: string;
  roomId?: string;
  accessToken?: string;
  type: 'consultation' | 'site_visit' | 'emergency' | 'follow_up' | 'inspection';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // DB field aliases (snake_case)
  job_id?: string;
  initiator_id?: string;
  participant_id?: string;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  recording_url?: string;
  room_id?: string;
  access_token?: string;
  created_at?: string;
  updated_at?: string;
  // Populated fields
  initiator?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  participant?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  job?: {
    title: string;
    category: string;
  };
}

export interface VideoCallParticipant {
  id: string;
  callId: string;
  userId: string;
  joinedAt?: string;
  leftAt?: string;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  role: 'host' | 'participant';
}

export interface VideoCallSettings {
  id: string;
  userId: string;
  autoJoinAudio: boolean;
  autoJoinVideo: boolean;
  preferredCamera?: string;
  preferredMicrophone?: string;
  recordingEnabled: boolean;
  notificationEnabled: boolean;
  maxCallDuration: number; // in minutes
  allowScreenShare: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CallQualityMetrics {
  id: string;
  callId: string;
  userId: string;
  audioQuality: 'poor' | 'fair' | 'good' | 'excellent';
  videoQuality: 'poor' | 'fair' | 'good' | 'excellent';
  connectionStability: 'unstable' | 'fair' | 'stable' | 'excellent';
  latencyMs: number;
  packetsLost: number;
  bandwidth: number; // in kbps
  timestamp: string;
  // DB field aliases (snake_case)
  call_id?: string;
  user_id?: string;
  audio_quality?: string;
  video_quality?: string;
  connection_stability?: string;
  latency_ms?: number;
  packets_lost?: number;
}

export interface VideoCallInvitation {
  id: string;
  callId: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  respondedAt?: string;
  createdAt: string;
  // DB field aliases (snake_case)
  call_id?: string;
  from_user_id?: string;
  to_user_id?: string;
  expires_at?: string;
  responded_at?: string;
  created_at?: string;
}

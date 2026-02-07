// Enhanced Video call types
export interface VideoCall {
  id: string;
  jobId?: string;
  initiatorId: string;
  participantId: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'pending' | 'active' | 'ended' | 'missed' | 'cancelled';
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number; // in seconds
  recordingUrl?: string;
  roomId?: string;
  accessToken?: string;
  type: 'consultation' | 'assessment' | 'project_review' | 'emergency' | 'follow_up';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
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
}

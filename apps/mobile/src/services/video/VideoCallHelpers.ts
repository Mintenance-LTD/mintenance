import type { DatabaseVideoCallRow, VideoCall } from './types';

/** Map a database row to the typed VideoCall interface. */
export function transformVideoCallData(data: DatabaseVideoCallRow): VideoCall {
  return {
    id: data.id,
    jobId: data.job_id,
    participants: data.participants || [],
    initiatorId: data.initiator_id,
    status: data.status,
    startTime: data.start_time || undefined,
    endTime: data.end_time || undefined,
    scheduledTime: data.scheduled_time || undefined,
    duration: data.duration || undefined,
    recordingUrl: data.recording_url || undefined,
    recordingEnabled: data.recording_enabled || false,
    screenSharingEnabled: data.screen_sharing_enabled || false,
    callQuality: data.call_quality || undefined,
    metadata: data.metadata ? {
      callPurpose: (data.metadata.callPurpose ?? 'consultation') as 'consultation' | 'progress_update' | 'problem_discussion' | 'final_walkthrough',
      notes: data.metadata.notes,
      issues: data.metadata.issues,
      resolution: data.metadata.resolution,
      followUpRequired: data.metadata.followUpRequired,
    } : undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export function getNotificationTitle(action: string): string {
  switch (action) {
    case 'scheduled': return 'Video Call Scheduled';
    case 'started':   return 'Video Call Starting';
    case 'completed': return 'Video Call Completed';
    case 'cancelled': return 'Video Call Cancelled';
    default:          return 'Video Call Update';
  }
}

export function getNotificationBody(action: string, call: VideoCall): string {
  switch (action) {
    case 'scheduled':
      return `A video call has been scheduled for ${new Date(call.scheduledTime!).toLocaleString()}`;
    case 'started':
      return 'A video call is starting now. Tap to join.';
    case 'completed':
      return `Video call completed. Duration: ${Math.floor((call.duration || 0) / 60)} minutes`;
    case 'cancelled':
      return 'The scheduled video call has been cancelled.';
    default:
      return 'Video call status updated';
  }
}

export function generateSessionToken(callId: string, userId: string): string {
  const timestamp = Date.now();
  const data = `${callId}-${userId}-${timestamp}`;
  return Buffer.from(data).toString('base64');
}

export async function getIceServers(): Promise<RTCIceServer[]> {
  // In production, fetch STUN/TURN servers from config.
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
}

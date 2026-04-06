import type { VideoCall } from '@mintenance/types';
import type { VideoCallRow } from './types';

export function formatVideoCall(data: VideoCallRow): VideoCall {
  return {
    id: data.id,
    jobId: data.job_id ?? undefined,
    initiatorId: data.initiator_id,
    participantId: data.participant_id,
    title: data.title,
    description: data.description ?? undefined,
    status: data.status,
    scheduledAt: data.scheduled_at ?? undefined,
    startedAt: data.started_at ?? undefined,
    endedAt: data.ended_at ?? undefined,
    duration: data.duration ?? undefined,
    recordingUrl: data.recording_url ?? undefined,
    roomId: data.room_id ?? undefined,
    accessToken: data.access_token ?? undefined,
    type: data.type,
    priority: data.priority,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    initiator: data.initiator ? {
      first_name: data.initiator.first_name as string,
      last_name: data.initiator.last_name as string,
      avatar_url: data.initiator.avatar_url ?? undefined
    } : undefined,
    participant: data.participant ? {
      first_name: data.participant.first_name as string,
      last_name: data.participant.last_name as string,
      avatar_url: data.participant.avatar_url ?? undefined
    } : undefined,
    job: data.job ? {
      title: data.job.title as string,
      category: data.job.category as string
    } : undefined
  };
}

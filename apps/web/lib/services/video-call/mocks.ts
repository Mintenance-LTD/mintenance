import type { VideoCall } from '@mintenance/types';
import type { VideoCallFallbackParams } from './types';

/**
 * Mock data for demo/fallback
 */
export function getMockVideoCall(params: VideoCallFallbackParams = {}): VideoCall {
  const now = new Date();
  const fallbackType: VideoCall['type'] = params.type ?? 'consultation';

  return {
    id: `call_${Date.now()}`,
    jobId: params.jobId,
    initiatorId: 'user_1',
    participantId: params.participantId ?? 'user_2',
    title: params.title ?? 'Video Call',
    description: params.description ?? 'Mock video call',
    status: params.scheduledAt ? 'scheduled' : 'pending',
    scheduledAt: params.scheduledAt,
    type: fallbackType,
    priority: 'medium',
    roomId: `room_${Date.now()}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    initiator: {
      first_name: 'John',
      last_name: 'Doe',
      avatar_url: 'https://example.com/avatar1.jpg'
    },
    participant: {
      first_name: 'Jane',
      last_name: 'Smith',
      avatar_url: 'https://example.com/avatar2.jpg'
    }
  };
}

export function getMockUserCalls(userId: string): VideoCall[] {
  return [
    {
      id: 'call_history_1',
      jobId: 'job_1',
      initiatorId: userId,
      participantId: 'contractor_1',
      title: 'Kitchen Renovation Consultation',
      description: 'Discuss project scope and timeline',
      status: 'ended',
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      duration: 1800, // 30 minutes
      type: 'consultation',
      priority: 'medium',
      roomId: 'room_history_1',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      participant: {
        first_name: 'Mike',
        last_name: 'Johnson',
        avatar_url: 'https://example.com/contractor1.jpg'
      },
      job: {
        title: 'Kitchen Renovation',
        category: 'kitchen'
      }
    },
    {
      id: 'call_history_2',
      jobId: 'job_2',
      initiatorId: 'contractor_2',
      participantId: userId,
      title: 'Plumbing Emergency Assessment',
      description: 'Remote evaluation of pipe leak',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      type: 'emergency',
      priority: 'urgent',
      roomId: 'room_history_2',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      initiator: {
        first_name: 'Sarah',
        last_name: 'Williams',
        avatar_url: 'https://example.com/contractor2.jpg'
      },
      job: {
        title: 'Emergency Plumbing Repair',
        category: 'plumbing'
      }
    }
  ];
}

export function getMockCallHistory(): VideoCall[] {
  return [getMockVideoCall({})];
}

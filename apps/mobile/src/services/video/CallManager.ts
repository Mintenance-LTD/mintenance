import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { handleDatabaseOperation, validateRequired } from '../../utils/serviceHelper';
import { performanceMonitor } from '../../utils/performance';
import { transformVideoCallData, generateSessionToken, getIceServers } from './VideoCallHelpers';
import { notifyParticipants, recordParticipantAction, getCallById } from './CallNotifier';
import type { VideoCall, CallSession, CallStatistics, DatabaseVideoCallRow } from './types';

// Module-level WebRTC state
let activeCall: VideoCall | null = null;
let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;

function cleanup(): void {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach((t) => t.stop());
    remoteStream = null;
  }
}

export function getActiveCall(): VideoCall | null {
  return activeCall;
}

export function isUserInCall(userId: string): boolean {
  return activeCall?.participants.includes(userId) || false;
}

export async function scheduleCall(
  jobId: string,
  initiatorId: string,
  participants: string[],
  scheduledTime: string,
  purpose: string,
  recordingEnabled: boolean = false
): Promise<VideoCall> {
  return performanceMonitor.measureAsync('schedule_video_call', async () => {
    const context = { service: 'VideoCallService', method: 'scheduleCall',
      params: { jobId, initiatorId, participants, scheduledTime, purpose } };

    validateRequired(jobId, 'jobId', context);
    validateRequired(initiatorId, 'initiatorId', context);
    validateRequired(participants, 'participants', context);
    validateRequired(scheduledTime, 'scheduledTime', context);

    return handleDatabaseOperation(async () => {
      const result = await supabase
        .from('video_calls')
        .insert({
          job_id: jobId,
          initiator_id: initiatorId,
          participants,
          status: 'scheduled' as const,
          scheduled_time: scheduledTime,
          recording_enabled: recordingEnabled,
          screen_sharing_enabled: false,
          metadata: { callPurpose: purpose, followUpRequired: false },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (result.error) throw new Error(`Failed to schedule call: ${result.error.message}`);

      const videoCall = transformVideoCallData(result.data as DatabaseVideoCallRow);
      await notifyParticipants(videoCall, 'scheduled');

      logger.info('Video call scheduled successfully', {
        callId: videoCall.id, jobId, participantCount: participants.length, scheduledTime,
      });

      return { data: videoCall, error: null };
    }, context);
  }, 'network');
}

export async function startInstantCall(
  jobId: string,
  initiatorId: string,
  participants: string[],
  purpose: string = 'consultation'
): Promise<VideoCall> {
  return performanceMonitor.measureAsync('start_instant_call', async () => {
    const context = { service: 'VideoCallService', method: 'startInstantCall',
      params: { jobId, initiatorId, participants, purpose } };

    validateRequired(jobId, 'jobId', context);
    validateRequired(initiatorId, 'initiatorId', context);
    validateRequired(participants, 'participants', context);

    return handleDatabaseOperation(async () => {
      const result = await supabase
        .from('video_calls')
        .insert({
          job_id: jobId,
          initiator_id: initiatorId,
          participants,
          status: 'active' as const,
          start_time: new Date().toISOString(),
          recording_enabled: false,
          screen_sharing_enabled: false,
          metadata: { callPurpose: purpose, followUpRequired: false },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (result.error) throw new Error(`Failed to start call: ${result.error.message}`);

      const videoCall = transformVideoCallData(result.data as DatabaseVideoCallRow);
      activeCall = videoCall;
      await notifyParticipants(videoCall, 'started');

      logger.info('Instant video call started', {
        callId: videoCall.id, jobId, participantCount: participants.length,
      });

      return { data: videoCall, error: null };
    }, context);
  }, 'network');
}

export async function joinCall(callId: string, userId: string): Promise<CallSession> {
  return performanceMonitor.measureAsync('join_video_call', async () => {
    const context = { service: 'VideoCallService', method: 'joinCall',
      params: { callId, userId } };

    validateRequired(callId, 'callId', context);
    validateRequired(userId, 'userId', context);

    return handleDatabaseOperation(async () => {
      const callResult = await supabase
        .from('video_calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callResult.error || !callResult.data) throw new Error('Call not found');

      const call = transformVideoCallData(callResult.data as DatabaseVideoCallRow);
      if (!call.participants.includes(userId)) {
        throw new Error('User not authorized to join this call');
      }

      if (call.status === 'scheduled') {
        await supabase
          .from('video_calls')
          .update({ status: 'active' as const, start_time: new Date().toISOString(),
            updated_at: new Date().toISOString() })
          .eq('id', callId);
      }

      const sessionToken = generateSessionToken(callId, userId);
      const iceServers = await getIceServers();

      const session: CallSession = {
        callId,
        sessionToken,
        iceServers,
        mediaConstraints: { audio: true, video: true, screenShare: false },
        bandwidth: { audio: 64, video: 500 },
      };

      await recordParticipantAction(callId, userId, 'joined');

      logger.info('User joined video call', {
        callId, userId, sessionToken: sessionToken.substring(0, 10) + '...',
      });

      return { data: session, error: null };
    }, context);
  }, 'network');
}

export async function endCall(
  callId: string,
  endedById: string,
  callNotes?: string,
  followUpRequired: boolean = false
): Promise<void> {
  await performanceMonitor.measureAsync('end_video_call', async () => {
    const context = { service: 'VideoCallService', method: 'endCall',
      params: { callId, endedById, followUpRequired } };

    validateRequired(callId, 'callId', context);
    validateRequired(endedById, 'endedById', context);

    return handleDatabaseOperation(async () => {
      const endTime = new Date().toISOString();

      const callResult = await supabase
        .from('video_calls')
        .select('start_time, metadata')
        .eq('id', callId)
        .single();

      if (callResult.error) throw new Error('Call not found');

      const dbRow = callResult.data as Pick<DatabaseVideoCallRow, 'start_time' | 'metadata'>;
      const startTime = new Date(dbRow.start_time || new Date());
      const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

      const updatedMetadata = {
        ...(dbRow.metadata || {}),
        notes: callNotes,
        followUpRequired,
        endedBy: endedById,
      };

      const result = await supabase
        .from('video_calls')
        .update({ status: 'completed' as const, end_time: endTime, duration,
          metadata: updatedMetadata, updated_at: endTime })
        .eq('id', callId);

      if (result.error) throw new Error(`Failed to end call: ${result.error.message}`);

      if (activeCall?.id === callId) {
        activeCall = null;
        cleanup();
      }

      const call = await getCallById(callId);
      if (call) {
        for (const participantId of call.participants) {
          await recordParticipantAction(callId, participantId, 'left');
        }
        await notifyParticipants(call, 'completed');
      }

      logger.info('Video call ended', { callId, duration, endedBy: endedById, followUpRequired });

      return { data: null, error: null };
    }, context);
  }, 'network');
}

export async function getCallHistory(jobId: string): Promise<VideoCall[]> {
  return performanceMonitor.measureAsync('get_call_history', async () => {
    const context = { service: 'VideoCallService', method: 'getCallHistory', params: { jobId } };

    validateRequired(jobId, 'jobId', context);

    return handleDatabaseOperation(async () => {
      const result = await supabase
        .from('video_calls')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (result.error) throw new Error(`Failed to get call history: ${result.error.message}`);

      const calls = (result.data as DatabaseVideoCallRow[] || []).map((call) =>
        transformVideoCallData(call)
      );

      return { data: calls, error: null };
    }, context);
  }, 'network');
}

export async function cancelCall(
  callId: string,
  cancelledById: string,
  reason?: string
): Promise<void> {
  await performanceMonitor.measureAsync('cancel_video_call', async () => {
    const context = { service: 'VideoCallService', method: 'cancelCall',
      params: { callId, cancelledById, reason } };

    return handleDatabaseOperation(async () => {
      const result = await supabase
        .from('video_calls')
        .update({
          status: 'cancelled' as const,
          metadata: { cancelledBy: cancelledById, cancellationReason: reason,
            cancelledAt: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq('id', callId)
        .select()
        .single();

      if (result.error) throw new Error(`Failed to cancel call: ${result.error.message}`);

      const call = transformVideoCallData(result.data as DatabaseVideoCallRow);
      await notifyParticipants(call, 'cancelled');

      logger.info('Video call cancelled', { callId, cancelledBy: cancelledById, reason });

      return { data: null, error: null };
    }, context);
  }, 'network');
}

export async function startRecording(callId: string, userId: string): Promise<void> {
  await performanceMonitor.measureAsync('start_call_recording', async () => {
    const context = { service: 'VideoCallService', method: 'startRecording',
      params: { callId, userId } };

    return handleDatabaseOperation(async () => {
      const result = await supabase
        .from('video_calls')
        .update({
          recording_enabled: true,
          metadata: { recordingStartedBy: userId, recordingStartedAt: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq('id', callId);

      if (result.error) throw new Error(`Failed to start recording: ${result.error.message}`);

      logger.info('Call recording started', { callId, startedBy: userId });

      return { data: null, error: null };
    }, context);
  }, 'network');
}

export async function getCallStatistics(callId: string): Promise<CallStatistics> {
  return performanceMonitor.measureAsync('get_call_statistics', async () => {
    const context = { service: 'VideoCallService', method: 'getCallStatistics',
      params: { callId } };

    return handleDatabaseOperation(async () => {
      const stats: CallStatistics = {
        callId,
        duration: 0,
        averageQuality: 'good',
        packetsLost: 0,
        bandwidthUsed: 0,
        reconnections: 0,
        participantStats: [],
      };

      return { data: stats, error: null };
    }, context);
  }, 'network');
}

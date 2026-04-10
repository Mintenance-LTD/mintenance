import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import {
  handleDatabaseOperation,
  validateRequired,
} from '../../utils/serviceHelper';
import { performanceMonitor } from '../../utils/performance';
import {
  transformVideoCallData,
  generateSessionToken,
  getIceServers,
} from './VideoCallHelpers';
import {
  notifyParticipants,
  recordParticipantAction,
  getCallById,
} from './CallNotifier';
import type { VideoCall, CallSession, DatabaseVideoCallRow } from './types';

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
  return performanceMonitor.measureAsync(
    'schedule_video_call',
    async () => {
      const context = {
        service: 'VideoCallService',
        method: 'scheduleCall',
        params: { jobId, initiatorId, participants, scheduledTime, purpose },
      };

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

        if (result.error)
          throw new Error(`Failed to schedule call: ${result.error.message}`);

        const videoCall = transformVideoCallData(
          result.data as DatabaseVideoCallRow
        );
        await notifyParticipants(videoCall, 'scheduled');

        logger.info('Video call scheduled successfully', {
          callId: videoCall.id,
          jobId,
          participantCount: participants.length,
          scheduledTime,
        });

        return { data: videoCall, error: null };
      }, context);
    },
    'network'
  );
}

export async function startInstantCall(
  jobId: string,
  initiatorId: string,
  participants: string[],
  purpose: string = 'consultation'
): Promise<VideoCall> {
  return performanceMonitor.measureAsync(
    'start_instant_call',
    async () => {
      const context = {
        service: 'VideoCallService',
        method: 'startInstantCall',
        params: { jobId, initiatorId, participants, purpose },
      };

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

        if (result.error)
          throw new Error(`Failed to start call: ${result.error.message}`);

        const videoCall = transformVideoCallData(
          result.data as DatabaseVideoCallRow
        );
        activeCall = videoCall;
        await notifyParticipants(videoCall, 'started');

        logger.info('Instant video call started', {
          callId: videoCall.id,
          jobId,
          participantCount: participants.length,
        });

        return { data: videoCall, error: null };
      }, context);
    },
    'network'
  );
}

export async function joinCall(
  callId: string,
  userId: string
): Promise<CallSession> {
  return performanceMonitor.measureAsync(
    'join_video_call',
    async () => {
      const context = {
        service: 'VideoCallService',
        method: 'joinCall',
        params: { callId, userId },
      };

      validateRequired(callId, 'callId', context);
      validateRequired(userId, 'userId', context);

      return handleDatabaseOperation(async () => {
        const callResult = await supabase
          .from('video_calls')
          .select('*')
          .eq('id', callId)
          .single();

        if (callResult.error || !callResult.data)
          throw new Error('Call not found');

        const call = transformVideoCallData(
          callResult.data as DatabaseVideoCallRow
        );
        if (!call.participants.includes(userId)) {
          throw new Error('User not authorized to join this call');
        }

        if (call.status === 'scheduled') {
          await supabase
            .from('video_calls')
            .update({
              status: 'active' as const,
              start_time: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
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
          callId,
          userId,
          sessionToken: sessionToken.substring(0, 10) + '...',
        });

        return { data: session, error: null };
      }, context);
    },
    'network'
  );
}

export async function endCall(
  callId: string,
  endedById: string,
  callNotes?: string,
  followUpRequired: boolean = false
): Promise<void> {
  await performanceMonitor.measureAsync(
    'end_video_call',
    async () => {
      const context = {
        service: 'VideoCallService',
        method: 'endCall',
        params: { callId, endedById, followUpRequired },
      };

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

        const dbRow = callResult.data as Pick<
          DatabaseVideoCallRow,
          'start_time' | 'metadata'
        >;
        const startTime = new Date(dbRow.start_time || new Date());
        const duration = Math.floor(
          (new Date().getTime() - startTime.getTime()) / 1000
        );

        const updatedMetadata = {
          ...(dbRow.metadata || {}),
          notes: callNotes,
          followUpRequired,
          endedBy: endedById,
        };

        const result = await supabase
          .from('video_calls')
          .update({
            status: 'completed' as const,
            end_time: endTime,
            duration,
            metadata: updatedMetadata,
            updated_at: endTime,
          })
          .eq('id', callId);

        if (result.error)
          throw new Error(`Failed to end call: ${result.error.message}`);

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

        logger.info('Video call ended', {
          callId,
          duration,
          endedBy: endedById,
          followUpRequired,
        });

        return { data: null, error: null };
      }, context);
    },
    'network'
  );
}

/**
 * Toggle mute on the local audio track.
 * Updates the WebRTC MediaStream track (if available) and persists
 * the participant state to the database.
 *
 * Returns the new muted state (true = muted, false = unmuted).
 */
export async function toggleMute(
  callId: string,
  userId: string,
  muted: boolean
): Promise<boolean> {
  try {
    // Toggle the actual WebRTC audio track if a local stream exists
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !muted;
      });
    }

    // Persist participant audio state to the database
    await supabase.from('call_participants').upsert({
      call_id: callId,
      user_id: userId,
      audio_enabled: !muted,
      timestamp: new Date().toISOString(),
    });

    logger.info('Audio mute toggled', { callId, userId, muted });
    return muted;
  } catch (error) {
    logger.error('Failed to toggle mute:', error);
    throw error;
  }
}

/**
 * Toggle the local video track on/off.
 * Updates the WebRTC MediaStream track (if available) and persists
 * the participant state to the database.
 *
 * Returns the new video-enabled state.
 */
export async function toggleVideo(
  callId: string,
  userId: string,
  videoEnabled: boolean
): Promise<boolean> {
  try {
    // Toggle the actual WebRTC video track if a local stream exists
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = videoEnabled;
      });
    }

    // Persist participant video state to the database
    await supabase.from('call_participants').upsert({
      call_id: callId,
      user_id: userId,
      video_enabled: videoEnabled,
      timestamp: new Date().toISOString(),
    });

    logger.info('Video toggled', { callId, userId, videoEnabled });
    return videoEnabled;
  } catch (error) {
    logger.error('Failed to toggle video:', error);
    throw error;
  }
}

/**
 * Start screen sharing by replacing the video track on the peer connection
 * with the screen capture track (when WebRTC is fully wired).
 * Updates the database to reflect screen-sharing state.
 */
export async function startScreenShare(
  callId: string,
  userId: string
): Promise<void> {
  try {
    // NOTE: Full screen-capture requires react-native-webrtc's
    // mediaDevices.getDisplayMedia() which is platform-specific.
    // When WebRTC is fully integrated, replace the video sender track here.

    await supabase
      .from('video_calls')
      .update({
        screen_sharing_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId);

    await supabase.from('call_participants').upsert({
      call_id: callId,
      user_id: userId,
      screen_sharing: true,
      timestamp: new Date().toISOString(),
    });

    logger.info('Screen sharing started', { callId, userId });
  } catch (error) {
    logger.error('Failed to start screen share:', error);
    throw error;
  }
}

/**
 * Stop screen sharing and restore the camera video track on the
 * peer connection (when WebRTC is fully wired).
 * Updates the database to reflect the stopped state.
 */
export async function stopScreenShare(
  callId: string,
  userId: string
): Promise<void> {
  try {
    await supabase
      .from('video_calls')
      .update({
        screen_sharing_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId);

    await supabase.from('call_participants').upsert({
      call_id: callId,
      user_id: userId,
      screen_sharing: false,
      timestamp: new Date().toISOString(),
    });

    logger.info('Screen sharing stopped', { callId, userId });
  } catch (error) {
    logger.error('Failed to stop screen share:', error);
    throw error;
  }
}

export async function cancelCall(
  callId: string,
  cancelledById: string,
  reason?: string
): Promise<void> {
  await performanceMonitor.measureAsync(
    'cancel_video_call',
    async () => {
      const context = {
        service: 'VideoCallService',
        method: 'cancelCall',
        params: { callId, cancelledById, reason },
      };

      return handleDatabaseOperation(async () => {
        const result = await supabase
          .from('video_calls')
          .update({
            status: 'cancelled' as const,
            metadata: {
              cancelledBy: cancelledById,
              cancellationReason: reason,
              cancelledAt: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', callId)
          .select()
          .single();

        if (result.error)
          throw new Error(`Failed to cancel call: ${result.error.message}`);

        const call = transformVideoCallData(
          result.data as DatabaseVideoCallRow
        );
        await notifyParticipants(call, 'cancelled');

        logger.info('Video call cancelled', {
          callId,
          cancelledBy: cancelledById,
          reason,
        });

        return { data: null, error: null };
      }, context);
    },
    'network'
  );
}

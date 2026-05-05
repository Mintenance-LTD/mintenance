import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { NotificationService } from '../NotificationService';
import { MessagingService } from '../MessagingService';
import {
  transformVideoCallData,
  getNotificationTitle,
  getNotificationBody,
} from './VideoCallHelpers';
import type {
  VideoCall,
  VideoCallNotificationData,
  DatabaseVideoCallRow,
} from './types';

export async function getCallById(callId: string): Promise<VideoCall | null> {
  const result = await supabase
    .from('video_calls')
    .select('*')
    .eq('id', callId)
    .single();

  if (result.error || !result.data) {
    return null;
  }

  return transformVideoCallData(result.data as DatabaseVideoCallRow);
}

export async function recordParticipantAction(
  callId: string,
  userId: string,
  action: 'joined' | 'left'
): Promise<void> {
  // 2026-05-02 audit follow-up (98% readiness step 4):
  // `call_participants` is a phantom table — it does NOT exist in the
  // live schema. Live joining is parked behind LIVE_VIDEO_CALLS_ENABLED
  // (see apps/mobile/src/screens/MessagingScreen.tsx) and this writer
  // is no-op'd to keep the banned-tables gate green. Re-enable by:
  //   1. Building the `call_participants` migration (RLS scoped to
  //      participants of the parent video_calls row).
  //   2. Adding `/api/contractor/calls/[id]/participants` (POST) with
  //      explicit ownership + action validation.
  //   3. Restoring this body to call the API instead of supabase
  //      directly.
  logger.info('recordParticipantAction stubbed (live calls disabled)', {
    callId,
    userId,
    action,
  });
}

export async function notifyParticipants(
  call: VideoCall,
  action: string
): Promise<void> {
  try {
    for (const participantId of call.participants) {
      if (participantId !== call.initiatorId) {
        const notificationData: VideoCallNotificationData = {
          type: 'system',
          action,
          callId: call.id,
          jobId: call.jobId,
        };

        await NotificationService.sendPushNotification(
          participantId,
          getNotificationTitle(action),
          getNotificationBody(action, call),
          notificationData,
          'system'
        );

        await sendVideoCallMessage(
          call,
          action,
          call.initiatorId,
          participantId
        );
      }
    }
  } catch (error) {
    logger.error('Failed to notify participants:', error);
  }
}

async function sendVideoCallMessage(
  call: VideoCall,
  action: string,
  senderId: string,
  receiverId: string
): Promise<void> {
  try {
    switch (action) {
      case 'scheduled':
        await MessagingService.sendVideoCallInvitation(
          call.jobId,
          receiverId,
          senderId,
          call.id
        );
        break;
      case 'started':
        await MessagingService.sendVideoCallStarted(
          call.jobId,
          receiverId,
          senderId,
          call.id
        );
        break;
      case 'completed':
        await MessagingService.sendVideoCallEnded(
          call.jobId,
          receiverId,
          senderId,
          call.id,
          call.duration || 0
        );
        break;
      case 'cancelled':
        await MessagingService.sendVideoCallMissed(
          call.jobId,
          receiverId,
          senderId,
          call.id
        );
        break;
      default:
        logger.warn('Unknown video call action for messaging:', action);
    }
  } catch (error) {
    logger.error('Failed to send video call message:', error);
  }
}

import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { NotificationService } from '../NotificationService';
import { MessagingService } from '../MessagingService';
import { transformVideoCallData, getNotificationTitle, getNotificationBody } from './VideoCallHelpers';
import type { VideoCall, VideoCallNotificationData, DatabaseVideoCallRow } from './types';

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
  try {
    await supabase
      .from('call_participants')
      .upsert({
        call_id: callId,
        user_id: userId,
        action,
        timestamp: new Date().toISOString(),
      });
  } catch (error) {
    logger.error('Failed to record participant action:', error);
  }
}

export async function notifyParticipants(call: VideoCall, action: string): Promise<void> {
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

        await sendVideoCallMessage(call, action, call.initiatorId, participantId);
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
        await MessagingService.sendVideoCallInvitation(call.jobId, receiverId, senderId, call.id);
        break;
      case 'started':
        await MessagingService.sendVideoCallStarted(call.jobId, receiverId, senderId, call.id);
        break;
      case 'completed':
        await MessagingService.sendVideoCallEnded(
          call.jobId, receiverId, senderId, call.id, call.duration || 0
        );
        break;
      case 'cancelled':
        await MessagingService.sendVideoCallMissed(call.jobId, receiverId, senderId, call.id);
        break;
      default:
        logger.warn('Unknown video call action for messaging:', action);
    }
  } catch (error) {
    logger.error('Failed to send video call message:', error);
  }
}

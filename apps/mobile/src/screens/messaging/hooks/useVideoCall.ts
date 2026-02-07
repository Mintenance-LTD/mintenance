import { useState } from 'react';
import { Alert } from 'react-native';
import { VideoCallService } from '../../../services/VideoCallService';
import { logger } from '../../../utils/logger';

interface UseVideoCallOptions {
  jobId: string;
  otherUserId: string;
  userId: string | undefined;
  userName: string | undefined;
  sendMessage: (params: {
    jobId: string;
    receiverId: string;
    messageText: string;
    senderId: string;
    messageType: string;
    callId?: string;
    callDuration?: number;
    scheduledTime?: string;
  }) => Promise<void>;
  scrollToEnd: () => void;
}

export function useVideoCall({
  jobId,
  otherUserId,
  userId,
  userName,
  sendMessage,
  scrollToEnd,
}: UseVideoCallOptions) {
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);

  const startVideoCall = async () => {
    if (!userId || VideoCallService.isUserInCall(userId)) {
      Alert.alert('Call in Progress', 'You are already in a video call.');
      return;
    }

    try {
      const call = await VideoCallService.startInstantCall(
        jobId,
        userId,
        [userId, otherUserId],
        'consultation'
      );

      if (call.data) {
        await sendMessage({
          jobId,
          receiverId: otherUserId,
          messageText: `${userName || 'Someone'} started a video call`,
          senderId: userId,
          messageType: 'video_call_invitation',
          callId: call.data.id,
        });

        setActiveCallId(call.data.id);
        setIsVideoCallActive(true);
        logger.info('Video call started', { callId: call.data.id });
        scrollToEnd();
      }
    } catch (error) {
      logger.error('Failed to start video call:', error);
      Alert.alert(
        'Error',
        'Failed to start video call. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCallAccept = (callId: string) => {
    if (!userId) return;
    setActiveCallId(callId);
    setIsVideoCallActive(true);
    logger.info('Joining video call', { callId });
  };

  const handleCallDecline = async (callId: string) => {
    try {
      await VideoCallService.cancelCall(callId, userId || '', 'declined');
      logger.info('Video call declined', { callId });
    } catch (error) {
      logger.error('Failed to decline video call:', error);
    }
  };

  const handleCallEnd = async () => {
    if (activeCallId && userId) {
      try {
        const callData = VideoCallService.getActiveCall();
        const duration = callData?.duration || 0;

        await sendMessage({
          jobId,
          receiverId: otherUserId,
          messageText: duration > 0
            ? `Video call ended (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`
            : 'Video call ended',
          senderId: userId,
          messageType: 'video_call_ended',
          callId: activeCallId,
          callDuration: duration,
        });

        scrollToEnd();
      } catch (error) {
        logger.error('Failed to send call ended message:', error);
      }
    }

    setIsVideoCallActive(false);
    setActiveCallId(null);
    logger.info('Video call ended from messaging screen');
  };

  const handleCallError = (error: string) => {
    logger.error('Video call error:', error);
    setIsVideoCallActive(false);
    setActiveCallId(null);
    Alert.alert('Video Call Error', error);
  };

  const handleCallScheduled = async (callId: string, scheduledTime: Date) => {
    if (!userId) return;

    try {
      await sendMessage({
        jobId,
        receiverId: otherUserId,
        messageText: `${userName || 'Someone'} scheduled a video call for ${scheduledTime.toLocaleDateString()} at ${scheduledTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        senderId: userId,
        messageType: 'video_call_scheduled',
        callId,
        scheduledTime: scheduledTime.toISOString(),
      });

      scrollToEnd();
      logger.info('Video call scheduled message sent', { callId, scheduledTime });
    } catch (error) {
      logger.error('Failed to send scheduled call message:', error);
    }
  };

  return {
    isVideoCallActive,
    activeCallId,
    showScheduler,
    setShowScheduler,
    startVideoCall,
    handleCallAccept,
    handleCallDecline,
    handleCallEnd,
    handleCallError,
    handleCallScheduled,
  };
}

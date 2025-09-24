import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Message } from '../../services/MessagingService';
import { VideoCallService } from '../../services/VideoCallService';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';

interface VideoCallMessageProps {
  message: Message;
  onCallAccept?: (callId: string) => void;
  onCallDecline?: (callId: string) => void;
  onViewCallDetails?: (callId: string) => void;
}

const VideoCallMessage: React.FC<VideoCallMessageProps> = ({
  message,
  onCallAccept,
  onCallDecline,
  onViewCallDetails,
}) => {
  const { user } = useAuth();

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  const getMessageIcon = (): string => {
    switch (message.messageType) {
      case 'video_call_invitation':
        return 'videocam';
      case 'video_call_started':
        return 'play';
      case 'video_call_ended':
        return 'stop';
      case 'video_call_missed':
        return 'call-outline';
      default:
        return 'videocam';
    }
  };

  const getMessageColor = (): string => {
    switch (message.messageType) {
      case 'video_call_invitation':
        return theme.colors.primary;
      case 'video_call_started':
        return theme.colors.success;
      case 'video_call_ended':
        return theme.colors.info;
      case 'video_call_missed':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getActionText = (): string => {
    switch (message.messageType) {
      case 'video_call_invitation':
        return 'Join Call';
      case 'video_call_started':
        return 'Call Started';
      case 'video_call_ended':
        return message.callDuration ? `Ended (${formatDuration(message.callDuration)})` : 'Ended';
      case 'video_call_missed':
        return 'Missed Call';
      default:
        return 'Video Call';
    }
  };

  const canJoinCall = (): boolean => {
    return (
      message.messageType === 'video_call_invitation' &&
      message.receiverId === user?.id &&
      message.callId &&
      !VideoCallService.isUserInCall(user.id)
    );
  };

  const handleJoinCall = async () => {
    if (!message.callId || !user) return;

    try {
      // Check if call is still active
      const activeCall = VideoCallService.getActiveCall();
      if (activeCall?.id === message.callId && activeCall.status === 'active') {
        // Join the call directly by triggering the callback
        onCallAccept?.(message.callId);
      } else if (activeCall?.id === message.callId && activeCall.status === 'scheduled') {
        // Call is scheduled but not started yet - start it
        await VideoCallService.startCall(message.callId, user.id);
        onCallAccept?.(message.callId);
      } else {
        Alert.alert(
          'Call Unavailable',
          'This video call is no longer active or has ended.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      logger.error('Error joining video call:', error);
      Alert.alert(
        'Error',
        'Unable to join the video call. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDeclineCall = () => {
    if (!message.callId) return;
    onCallDecline?.(message.callId);
  };

  const handleViewDetails = () => {
    if (!message.callId) return;
    onViewCallDetails?.(message.callId);
  };

  const isFromCurrentUser = message.senderId === user?.id;

  return (
    <View style={[
      styles.container,
      isFromCurrentUser ? styles.sentMessage : styles.receivedMessage
    ]}>
      <View style={styles.messageHeader}>
        <View style={[styles.iconContainer, { backgroundColor: getMessageColor() }]}>
          <Ionicons
            name={getMessageIcon() as any}
            size={16}
            color={theme.colors.surface}
          />
        </View>
        <Text style={styles.messageText}>{message.messageText}</Text>
      </View>

      {message.messageType === 'video_call_ended' && message.callDuration && (
        <Text style={styles.durationText}>
          Duration: {formatDuration(message.callDuration)}
        </Text>
      )}

      <View style={styles.actionsContainer}>
        {canJoinCall() ? (
          <View style={styles.callActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={handleDeclineCall}
            >
              <Ionicons name="close" size={16} color={theme.colors.surface} />
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.joinButton]}
              onPress={handleJoinCall}
            >
              <Ionicons name="videocam" size={16} color={theme.colors.surface} />
              <Text style={styles.actionButtonText}>Join</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={handleViewDetails}
          >
            <Text style={styles.detailsButtonText}>{getActionText()}</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.timestamp}>
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary + '20',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  durationText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  actionsContainer: {
    marginTop: 4,
  },
  callActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  joinButton: {
    backgroundColor: theme.colors.success,
  },
  declineButton: {
    backgroundColor: theme.colors.error,
  },
  actionButtonText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  detailsButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'right',
  },
});

export default VideoCallMessage;
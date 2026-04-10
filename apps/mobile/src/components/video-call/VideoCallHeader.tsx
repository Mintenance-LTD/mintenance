import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './videoCallInterfaceStyles';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { CallParticipant } from '../../services/VideoCallService';

interface VideoCallHeaderProps {
  participants: CallParticipant[];
  currentUserId: string | undefined;
  callDuration: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isRecording: boolean;
  formatDuration: (seconds: number) => string;
}

function getQualityColor(connectionQuality: string): string {
  switch (connectionQuality) {
    case 'excellent':
      return theme.colors.primary;
    case 'good':
      return theme.colors.textPrimary;
    case 'fair':
      return theme.colors.accent;
    case 'poor':
      return theme.colors.error;
    default:
      return theme.colors.textSecondary;
  }
}

const VideoCallHeader: React.FC<VideoCallHeaderProps> = ({
  participants,
  currentUserId,
  callDuration,
  connectionQuality,
  isRecording,
  formatDuration,
}) => {
  return (
    <LinearGradient
      colors={['rgba(0,0,0,0.7)', 'transparent']}
      style={styles.topOverlay}
    >
      <View style={styles.callInfo}>
        <View style={styles.callDetails}>
          <Text style={styles.participantName}>
            {participants.find((p) => p.userId !== currentUserId)?.userId ||
              'Unknown'}
          </Text>
          <View style={styles.durationContainer}>
            <View
              style={[
                styles.qualityIndicator,
                { backgroundColor: getQualityColor(connectionQuality) },
              ]}
            />
            <Text style={styles.durationText}>
              {formatDuration(callDuration)}
            </Text>
          </View>
        </View>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>REC</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
};

export default VideoCallHeader;

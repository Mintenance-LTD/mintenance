import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoCallService } from '../../../services/VideoCallService';
import { theme } from '../../../theme';

interface ChatHeaderProps {
  otherUserName: string;
  jobTitle: string;
  userId: string;
  onGoBack: () => void;
  onScheduleCall: () => void;
  onStartVideoCall: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  otherUserName,
  jobTitle,
  userId,
  onGoBack,
  onScheduleCall,
  onStartVideoCall,
}) => {
  const isInCall = VideoCallService.isUserInCall(userId);

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
        <Ionicons name='arrow-back' size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>{otherUserName}</Text>
        <Text style={styles.headerSubtitle}>{jobTitle}</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onScheduleCall}
          disabled={isInCall}
        >
          <Ionicons
            name='calendar'
            size={20}
            color={isInCall ? theme.colors.textTertiary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onStartVideoCall}
          disabled={isInCall}
        >
          <Ionicons
            name='videocam'
            size={24}
            color={isInCall ? theme.colors.textTertiary : theme.colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name='ellipsis-vertical' size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
});

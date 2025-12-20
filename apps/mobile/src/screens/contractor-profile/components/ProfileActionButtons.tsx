/**
 * ProfileActionButtons Component
 * 
 * Action buttons for messaging, calling, video, and sharing.
 * 
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Action buttons
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ProfileActionButtonsProps {
  onMessage: () => void;
  onCall: () => void;
  onVideo: () => void;
  onShare: () => void;
}

export const ProfileActionButtons: React.FC<ProfileActionButtonsProps> = ({
  onMessage,
  onCall,
  onVideo,
  onShare,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.actionButton} onPress={onMessage}>
        <Ionicons name="chatbubble-outline" size={18} color={theme.colors.white} />
        <Text style={styles.actionButtonText}>Message</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={onCall}>
        <Ionicons name="call-outline" size={18} color={theme.colors.white} />
        <Text style={styles.actionButtonText}>Call</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={onVideo}>
        <Ionicons name="videocam-outline" size={18} color={theme.colors.white} />
        <Text style={styles.actionButtonText}>Video</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={onShare}>
        <Ionicons name="share-social-outline" size={18} color={theme.colors.white} />
        <Text style={styles.actionButtonText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary, // Emerald Green
    borderRadius: theme.borderRadius.base,
    paddingVertical: theme.spacing.md,
    gap: 6,
    ...theme.shadows.sm,
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

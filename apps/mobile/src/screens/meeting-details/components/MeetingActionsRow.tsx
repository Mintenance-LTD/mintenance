import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { styles } from '../../meetingDetailsStyles';

/**
 * Four-button action row: Call / Message / Reschedule / Cancel.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44g).
 */
export function MeetingActionsRow({
  onCall,
  onMessage,
  onReschedule,
  onCancel,
}: {
  onCall: () => void;
  onMessage: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.actionsSection}>
      <Text style={styles.sectionTitle}>Actions</Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={onCall}>
          <Ionicons name='call' size={20} color={theme.colors.primary} />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onMessage}>
          <Ionicons
            name='chatbubble'
            size={20}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onReschedule}>
          <Ionicons
            name='calendar'
            size={20}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.actionButtonText}>Reschedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onCancel}>
          <Ionicons name='close-circle' size={20} color={theme.colors.error} />
          <Text style={styles.actionButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

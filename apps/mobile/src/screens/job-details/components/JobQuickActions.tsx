import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { styles } from '../jobDetailsStyles';

interface JobQuickActionsProps {
  jobId: string;
  jobTitle: string;
  isOwner: boolean;
  status: string;
  isCompletionConfirmedByHomeowner: boolean;
  onTimelinePress: () => void;
  onEditPress: () => void;
  onSignOffPress: () => void;
  onDisputePress: () => void;
}

/**
 * Quick-action rows shown at the bottom of the JobDetailsScreen:
 *   - Timeline (always)
 *   - Edit (homeowner, only if posted)
 *   - Sign-off (homeowner, only if completed and not yet confirmed)
 *   - Report a Problem (anyone, only if in_progress or completed)
 *
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44c).
 */
export function JobQuickActions({
  isOwner,
  status,
  isCompletionConfirmedByHomeowner,
  onTimelinePress,
  onEditPress,
  onSignOffPress,
  onDisputePress,
}: JobQuickActionsProps) {
  return (
    <View style={styles.quickActionsSection}>
      <TouchableOpacity
        style={styles.quickActionRow}
        onPress={onTimelinePress}
        accessibilityRole='button'
      >
        <Ionicons
          name='time-outline'
          size={20}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.quickActionText}>View Timeline</Text>
        <Ionicons
          name='chevron-forward'
          size={18}
          color={theme.colors.textTertiary}
        />
      </TouchableOpacity>

      {isOwner && status === 'posted' && (
        <TouchableOpacity
          style={styles.quickActionRow}
          onPress={onEditPress}
          accessibilityRole='button'
        >
          <Ionicons
            name='create-outline'
            size={20}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.quickActionText}>Edit Job</Text>
          <Ionicons
            name='chevron-forward'
            size={18}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>
      )}

      {isOwner &&
        status === 'completed' &&
        !isCompletionConfirmedByHomeowner && (
          <TouchableOpacity
            style={styles.quickActionRow}
            onPress={onSignOffPress}
            accessibilityRole='button'
          >
            <Ionicons
              name='checkmark-done-outline'
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.quickActionText}>
              Approve / Request Changes
            </Text>
            <Ionicons
              name='chevron-forward'
              size={18}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        )}

      {(status === 'in_progress' || status === 'completed') && (
        <TouchableOpacity
          style={styles.quickActionRow}
          onPress={onDisputePress}
          accessibilityRole='button'
        >
          <Ionicons
            name='warning-outline'
            size={20}
            color={theme.colors.error}
          />
          <Text style={[styles.quickActionText, { color: theme.colors.error }]}>
            Report a Problem
          </Text>
          <Ionicons
            name='chevron-forward'
            size={18}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * QuickActions Component
 * 
 * Displays quick action buttons for contractors to browse jobs and access inbox.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useHaptics } from '../../utils/haptics';

interface QuickActionsProps {
  onBrowseJobsPress: () => void;
  onInboxPress: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onBrowseJobsPress,
  onInboxPress,
}) => {
  const haptics = useHaptics();

  return (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            haptics.buttonPress();
            onBrowseJobsPress();
          }}
          accessibilityRole="button"
          accessibilityLabel="Browse available jobs"
        >
          <View style={styles.actionIcon}>
            <Ionicons name="search" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.actionTitle}>Browse Jobs</Text>
          <Text style={styles.actionSubtitle}>Find new opportunities</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            haptics.buttonPress();
            onInboxPress();
          }}
          accessibilityRole="button"
          accessibilityLabel="Open inbox"
        >
          <View style={styles.actionIcon}>
            <Ionicons name="mail" size={24} color={theme.colors.accent} />
          </View>
          <Text style={styles.actionTitle}>Inbox</Text>
          <Text style={styles.actionSubtitle}>Messages & updates</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  quickActionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...theme.shadows.base,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

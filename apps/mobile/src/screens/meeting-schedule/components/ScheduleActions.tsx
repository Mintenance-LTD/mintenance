/**
 * ScheduleActions Component
 *
 * Action buttons for scheduling and canceling.
 *
 * @filesize Target: <70 lines
 * @compliance Single Responsibility - Action buttons
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../../../theme';

interface ScheduleActionsProps {
  loading: boolean;
  onSchedule: () => void;
  onCancel: () => void;
}

export const ScheduleActions: React.FC<ScheduleActionsProps> = ({
  loading,
  onSchedule,
  onCancel,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton, { backgroundColor: theme.colors.backgroundSecondary }]}
          onPress={onCancel}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel='Cancel scheduling'
        >
          <Text style={[styles.cancelButtonText, { color: theme.colors.textPrimary }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.scheduleButton, { backgroundColor: theme.colors.textPrimary }]}
          onPress={onSchedule}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel={loading ? 'Scheduling meeting' : 'Schedule meeting'}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Text style={[styles.scheduleButtonText, { color: theme.colors.textInverse }]}>Schedule Meeting</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
  },
  scheduleButton: {
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

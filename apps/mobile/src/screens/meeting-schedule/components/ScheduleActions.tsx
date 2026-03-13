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
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel='Cancel scheduling'
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.scheduleButton]}
          onPress={onSchedule}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel={loading ? 'Scheduling meeting' : 'Schedule meeting'}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.scheduleButtonText}>Schedule Meeting</Text>
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
    backgroundColor: '#F7F7F7',
  },
  scheduleButton: {
    backgroundColor: '#222222',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

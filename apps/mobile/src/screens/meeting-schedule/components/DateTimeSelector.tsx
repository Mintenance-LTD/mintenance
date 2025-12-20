/**
 * DateTimeSelector Component
 * 
 * Date and time picker interface.
 * 
 * @filesize Target: <90 lines
 * @compliance Single Responsibility - DateTime selection
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface DateTimeSelectorProps {
  selectedDate: Date;
  selectedTime: Date;
  showDatePicker: boolean;
  showTimePicker: boolean;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: Date) => void;
  onShowDatePicker: (show: boolean) => void;
  onShowTimePicker: (show: boolean) => void;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  selectedDate,
  selectedTime,
  showDatePicker,
  showTimePicker,
  onDateChange,
  onTimeChange,
  onShowDatePicker,
  onShowTimePicker,
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Date & Time</Text>
      
      <View style={styles.selectorRow}>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => onShowDatePicker(true)}
        >
          <View style={styles.selectorContent}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <View style={styles.selectorText}>
              <Text style={styles.selectorLabel}>Date</Text>
              <Text style={styles.selectorValue}>{formatDate(selectedDate)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => onShowTimePicker(true)}
        >
          <View style={styles.selectorContent}>
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <View style={styles.selectorText}>
              <Text style={styles.selectorLabel}>Time</Text>
              <Text style={styles.selectorValue}>{formatTime(selectedTime)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            onShowDatePicker(false);
            if (date) onDateChange(date);
          }}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, time) => {
            onShowTimePicker(false);
            if (time) onTimeChange(time);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  selectorRow: {
    gap: theme.spacing.md,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  selectorText: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});

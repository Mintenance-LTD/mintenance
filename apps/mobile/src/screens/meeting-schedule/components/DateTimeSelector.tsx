/**
 * DateTimeSelector Component
 *
 * Date and time picker interface.
 *
 * @filesize Target: <90 lines
 * @compliance Single Responsibility - DateTime selection
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

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
    <View style={[styles.container, { backgroundColor: me.surface }]}>
      <Text
        style={[styles.sectionTitle, { color: me.ink3 }]}
        accessibilityRole='header'
      >
        DATE & TIME
      </Text>

      <View style={styles.selectorRow}>
        <TouchableOpacity
          style={[styles.selectorButton, { backgroundColor: me.bg2 }]}
          onPress={() => onShowDatePicker(true)}
          accessibilityRole='button'
          accessibilityLabel={`Selected date: ${formatDate(selectedDate)}. Double tap to change`}
        >
          <View style={styles.selectorContent}>
            <View style={styles.iconWrap}>
              <Ionicons name='calendar-outline' size={16} color='#3B82F6' />
            </View>
            <View style={styles.selectorText}>
              <Text style={[styles.selectorLabel, { color: me.ink2 }]}>
                Date
              </Text>
              <Text style={[styles.selectorValue, { color: me.ink }]}>
                {formatDate(selectedDate)}
              </Text>
            </View>
          </View>
          <Ionicons name='chevron-down' size={20} color={me.ink3} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selectorButton, { backgroundColor: me.bg2 }]}
          onPress={() => onShowTimePicker(true)}
          accessibilityRole='button'
          accessibilityLabel={`Selected time: ${formatTime(selectedTime)}. Double tap to change`}
        >
          <View style={styles.selectorContent}>
            <View style={[styles.iconWrap, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name='time-outline' size={16} color='#8B5CF6' />
            </View>
            <View style={styles.selectorText}>
              <Text style={[styles.selectorLabel, { color: me.ink2 }]}>
                Time
              </Text>
              <Text style={[styles.selectorValue, { color: me.ink }]}>
                {formatTime(selectedTime)}
              </Text>
            </View>
          </View>
          <Ionicons name='chevron-down' size={20} color={me.ink3} />
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode='date'
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
          mode='time'
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...me.shadow.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  selectorRow: {
    gap: 12,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 14,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorText: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 15,
    fontWeight: '500',
  },
});

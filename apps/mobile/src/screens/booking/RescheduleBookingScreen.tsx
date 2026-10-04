import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useToast } from '../../components/ui/Toast';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { RootStackParamList } from '../../navigation/types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { me } from '../../design-system/mint-editorial';

interface Props {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    'RescheduleBooking'
  >;
  route: RouteProp<RootStackParamList, 'RescheduleBooking'>;
}

export const RescheduleBookingScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { bookingId } = route.params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const suggestedTime = new Date(Date.now() + 60 * 60 * 1000);

  const [selectedDate, setSelectedDate] = useState<Date>(suggestedTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDateChange = (_event: unknown, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const updated = new Date(date);
      updated.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setSelectedDate(updated);
    }
  };

  const handleTimeChange = (_event: unknown, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      const updated = new Date(selectedDate);
      updated.setHours(time.getHours(), time.getMinutes());
      setSelectedDate(updated);
    }
  };

  const handleConfirm = async () => {
    if (selectedDate.getTime() <= Date.now()) {
      toast.error(
        'Choose a future time',
        'You can choose today, including weekends, with a time later than now.'
      );
      return;
    }
    setLoading(true);
    try {
      await mobileApiClient.patch(`/api/bookings/${bookingId}/reschedule`, {
        newDateTime: selectedDate.toISOString(),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.jobs.all }),
        qc.invalidateQueries({ queryKey: ['contractor-schedule'] }),
        qc.invalidateQueries({ queryKey: ['booking-details', bookingId] }),
      ]);
      toast.success(
        'Booking rescheduled',
        `New date: ${formatDate(selectedDate)}`
      );
      navigation.goBack();
    } catch (error) {
      toast.error(
        'Failed to reschedule',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.surface} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Booking</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose New Date & Time</Text>
          <Text style={styles.cardSubtitle}>
            Select when you would like to reschedule your booking.
          </Text>

          <TouchableOpacity
            style={styles.pickerRow}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.pickerIconWrap}>
              <Ionicons name='calendar-outline' size={18} color='#3B82F6' />
            </View>
            <View style={styles.pickerInfo}>
              <Text style={styles.pickerLabel}>Date</Text>
              <Text style={styles.pickerValue}>{formatDate(selectedDate)}</Text>
            </View>
            <Ionicons name='chevron-forward' size={20} color={me.ink3} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickerRow}
            onPress={() => setShowTimePicker(true)}
          >
            <View
              style={[styles.pickerIconWrap, { backgroundColor: '#EDE9FE' }]}
            >
              <Ionicons name='time-outline' size={18} color='#8B5CF6' />
            </View>
            <View style={styles.pickerInfo}>
              <Text style={styles.pickerLabel}>Time</Text>
              <Text style={styles.pickerValue}>{formatTime(selectedDate)}</Text>
            </View>
            <Ionicons name='chevron-forward' size={20} color={me.ink3} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode='date'
            minimumDate={today}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode='time'
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        <TouchableOpacity
          style={[
            styles.confirmButton,
            loading && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? 'Rescheduling\u2026' : 'Confirm Reschedule'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  headerButton: { padding: 8, width: 40 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  content: { padding: 16 },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...me.shadow.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: me.ink2,
    marginBottom: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
  },
  pickerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerInfo: { flex: 1, marginLeft: 12 },
  pickerLabel: {
    fontSize: 12,
    color: me.ink3,
    marginBottom: 2,
  },
  pickerValue: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  confirmButton: {
    backgroundColor: me.ink,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
});

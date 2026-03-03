import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { theme } from '../../theme';
import { useToast } from '../../components/ui/Toast';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { RootStackParamList } from '../../navigation/types';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RescheduleBooking'>;
  route: RouteProp<RootStackParamList, 'RescheduleBooking'>;
}

export const RescheduleBookingScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { bookingId } = route.params;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [selectedDate, setSelectedDate] = useState<Date>(tomorrow);
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
    setLoading(true);
    try {
      await mobileApiClient.patch(`/api/bookings/${bookingId}/reschedule`, {
        newDateTime: selectedDate.toISOString(),
      });
      toast.success('Booking rescheduled', `New date: ${formatDate(selectedDate)}`);
      navigation.goBack();
    } catch {
      toast.error('Failed to reschedule', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Booking</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose New Date & Time</Text>
          <Text style={styles.cardSubtitle}>Select when you would like to reschedule your booking.</Text>

          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={22} color={theme.colors.primary} />
            <View style={styles.pickerInfo}>
              <Text style={styles.pickerLabel}>Date</Text>
              <Text style={styles.pickerValue}>{formatDate(selectedDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={22} color={theme.colors.primary} />
            <View style={styles.pickerInfo}>
              <Text style={styles.pickerLabel}>Time</Text>
              <Text style={styles.pickerValue}>{formatTime(selectedDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            minimumDate={tomorrow}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? 'Rescheduling…' : 'Confirm Reschedule'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.primary,
  },
  headerButton: { padding: 8, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textInverse },
  content: { padding: 16 },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    marginBottom: 20,
    ...theme.shadows.base,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 20 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pickerInfo: { flex: 1, marginLeft: 12 },
  pickerLabel: { fontSize: 12, color: theme.colors.textTertiary, marginBottom: 2 },
  pickerValue: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { color: theme.colors.textInverse, fontSize: 16, fontWeight: '700' },
});

export default RescheduleBookingScreen;

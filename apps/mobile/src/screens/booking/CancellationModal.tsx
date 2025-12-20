/**
 * CancellationModal Component
 * 
 * Modal for cancelling bookings with reason selection.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Booking } from './BookingStatusScreen';
import { useHaptics } from '../../utils/haptics';

interface CancellationModalProps {
  visible: boolean;
  booking: Booking | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

interface CancellationReason {
  id: string;
  reason: string;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
  visible,
  booking,
  onConfirm,
  onCancel,
}) => {
  const haptics = useHaptics();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const cancellationReasons: CancellationReason[] = [
    { id: 'schedule_change', reason: 'Schedule Change' },
    { id: 'weather_conditions', reason: 'Weather conditions' },
    { id: 'parking_availability', reason: 'Parking Availability' },
    { id: 'lack_of_amenities', reason: 'Lack of amenities' },
    { id: 'alternative_option', reason: 'I have alternative option' },
    { id: 'other', reason: 'Other' },
  ];

  const handleConfirm = async () => {
    if (!selectedReason) return;

    setCancelling(true);
    try {
      const reason = selectedReason === 'other' ? customReason : selectedReason;
      await onConfirm(reason);
    } finally {
      setCancelling(false);
    }
  };

  const handleCancel = () => {
    setSelectedReason('');
    setCustomReason('');
    onCancel();
  };

  if (!visible || !booking) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Cancel Booking</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.bookingInfo}>
            <Text style={styles.serviceName}>{booking.serviceName}</Text>
            <Text style={styles.bookingDate}>{booking.date} at {booking.time}</Text>
          </View>

          <Text style={styles.reasonLabel}>Why are you cancelling?</Text>

          <ScrollView style={styles.reasonsList}>
            {cancellationReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonItem,
                  selectedReason === reason.id && styles.selectedReasonItem,
                ]}
                onPress={() => {
                  haptics.buttonPress();
                  setSelectedReason(reason.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Select reason: ${reason.reason}`}
              >
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason.id && styles.selectedReasonText,
                  ]}
                >
                  {reason.reason}
                </Text>
                {selectedReason === reason.id && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedReason === 'other' && (
            <View style={styles.customReasonContainer}>
              <Text style={styles.customReasonLabel}>Please specify:</Text>
              <TextInput
                style={styles.customReasonInput}
                value={customReason}
                onChangeText={setCustomReason}
                placeholder="Enter your reason..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={cancelling}
            >
              <Text style={styles.cancelButtonText}>Keep Booking</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedReason || (selectedReason === 'other' && !customReason.trim())) && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={!selectedReason || (selectedReason === 'other' && !customReason.trim()) || cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.confirmButtonText}>Cancel Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    ...theme.shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  bookingInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    padding: 20,
    paddingBottom: 12,
  },
  reasonsList: {
    maxHeight: 200,
    paddingHorizontal: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  selectedReasonItem: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  reasonText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  selectedReasonText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  customReasonContainer: {
    padding: 20,
    paddingTop: 0,
  },
  customReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  customReasonInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: theme.colors.error,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.textTertiary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});

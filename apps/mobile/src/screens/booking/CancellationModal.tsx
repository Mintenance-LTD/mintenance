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
            <Text style={styles.title} accessibilityRole='header'>Cancel Booking</Text>
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
                accessibilityLabel='Cancellation reason'
                accessibilityHint='Enter your reason for cancelling the booking'
              />
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={cancelling}
              accessibilityRole='button'
              accessibilityLabel='Keep booking'
              accessibilityHint='Double tap to dismiss and keep your booking'
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
              accessibilityRole='button'
              accessibilityLabel='Cancel booking'
              accessibilityHint='Double tap to confirm cancellation of your booking'
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
    backgroundColor: theme.colors.overlayDark50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[5],
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xxl,
    width: '100%',
    maxHeight: '80%',
    ...theme.shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  bookingInfo: {
    padding: theme.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  serviceName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  bookingDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  reasonLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[3],
  },
  reasonsList: {
    maxHeight: 200,
    paddingHorizontal: theme.spacing[5],
  },
  reasonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  selectedReasonItem: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  reasonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  selectedReasonText: {
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  customReasonContainer: {
    padding: theme.spacing[5],
    paddingTop: 0,
  },
  customReasonLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  customReasonInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing[5],
    gap: theme.spacing[3],
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.textTertiary,
  },
  confirmButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
});

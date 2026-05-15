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
import { Booking } from './BookingStatusScreen';
import { useHaptics } from '../../utils/haptics';
import { me } from '../../design-system/mint-editorial';

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
      animationType='fade'
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole='header'>
              Cancel Booking
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancel}
              accessibilityRole='button'
              accessibilityLabel='Close modal'
            >
              <Ionicons name='close' size={24} color={me.ink2} />
            </TouchableOpacity>
          </View>

          <View style={styles.bookingInfo}>
            <Text style={styles.serviceName}>{booking.serviceName}</Text>
            <Text style={styles.bookingDate}>
              {booking.date} at {booking.time}
            </Text>
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
                accessibilityRole='button'
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
                  <Ionicons name='checkmark' size={20} color={me.ink} />
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
                placeholder='Enter your reason...'
                placeholderTextColor={me.ink3}
                multiline
                numberOfLines={3}
                textAlignVertical='top'
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
                (!selectedReason ||
                  (selectedReason === 'other' && !customReason.trim())) &&
                  styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={
                !selectedReason ||
                (selectedReason === 'other' && !customReason.trim()) ||
                cancelling
              }
              accessibilityRole='button'
              accessibilityLabel='Cancel booking'
              accessibilityHint='Double tap to confirm cancellation of your booking'
            >
              {cancelling ? (
                <ActivityIndicator size='small' color={me.onBrand} />
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: me.surface,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  closeButton: {
    padding: 4,
  },
  bookingInfo: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 13,
    color: me.ink2,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: me.bg2,
  },
  selectedReasonItem: {
    backgroundColor: '#DBEAFE',
  },
  reasonText: {
    fontSize: 15,
    color: me.ink,
  },
  selectedReasonText: {
    color: me.ink,
    fontWeight: '600',
  },
  customReasonContainer: {
    padding: 20,
    paddingTop: 0,
  },
  customReasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 8,
  },
  customReasonInput: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: me.ink,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: me.bg2,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: me.errFg,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: me.ink3,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.onBrand,
  },
});

/**
 * Cancellation Modal Component
 *
 * Modal for handling booking cancellation with reason selection.
 * Focused component with single responsibility.
 *
 * @filesize Target: <250 lines
 * @compliance Architecture principles - Single responsibility
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../../components/ui/Input';
import { theme } from '../../../theme';
import type { Booking, CancellationReason } from '../viewmodels/BookingViewModel';
import { cancellationReasons } from '../viewmodels/BookingViewModel';

interface CancellationModalProps {
  visible: boolean;
  booking: Booking | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string, customReason?: string) => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
  visible,
  booking,
  loading,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  const handleConfirm = () => {
    if (!selectedReason) return;

    const customReasonText = selectedReason === 'other' ? customReason.trim() : undefined;
    onConfirm(selectedReason, customReasonText);

    // Reset state
    setSelectedReason('');
    setCustomReason('');
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  const isConfirmDisabled = !selectedReason ||
    (selectedReason === 'other' && !customReason.trim()) ||
    loading;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>

          <Text style={styles.title}>Cancel Booking</Text>

          <View style={styles.spacer} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {booking && (
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingTitle}>{booking.serviceName}</Text>
              <Text style={styles.bookingDetails}>
                {booking.contractorName} • {booking.date} at {booking.time}
              </Text>
            </View>
          )}

          <Text style={styles.question}>
            Please select the reason for cancellation:
          </Text>

          {/* Cancellation Reasons */}
          <View style={styles.reasonsList}>
            {cancellationReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonOption,
                  selectedReason === reason.id && styles.reasonSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radioButton,
                    selectedReason === reason.id && styles.radioSelected,
                  ]}
                >
                  {selectedReason === reason.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.reasonText}>{reason.reason}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Reason Input */}
          {selectedReason === 'other' && (
            <View style={styles.customReasonContainer}>
              <Input
                label="Other Reason"
                placeholder="Enter your reason for cancellation"
                value={customReason}
                onChangeText={setCustomReason}
                maxLength={500}
                multiline
                numberOfLines={4}
                leftIcon="create-outline"
                variant="outline"
                size="lg"
                fullWidth
              />
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              isConfirmDisabled && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={isConfirmDisabled}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.confirmButtonText}>Cancel Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  spacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bookingInfo: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  bookingDetails: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 20,
  },
  reasonsList: {
    gap: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reasonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  reasonText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  customReasonContainer: {
    marginTop: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  confirmButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  confirmButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.5,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
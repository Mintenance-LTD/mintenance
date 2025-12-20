/**
 * BookingCard Component
 * 
 * Displays individual booking information with status-specific actions.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Booking } from './BookingStatusScreen';
import { useHaptics } from '../../utils/haptics';

interface BookingCardProps {
  booking: Booking;
  onCancel: (booking: Booking) => void;
  onReschedule: (booking: Booking) => void;
  onRate: (booking: Booking) => void;
  onShare: (booking: Booking) => void;
  onViewDetails: (booking: Booking) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancel,
  onReschedule,
  onRate,
  onShare,
  onViewDetails,
}) => {
  const haptics = useHaptics();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.successDark;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'time-outline';
      case 'completed':
        return 'checkmark-circle-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{booking.serviceName}</Text>
          <View style={styles.statusContainer}>
            <Ionicons
              name={getStatusIcon(booking.status) as any}
              size={16}
              color={getStatusColor(booking.status)}
            />
            <Text style={[styles.status, { color: getStatusColor(booking.status) }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            haptics.buttonPress();
            onShare(booking);
          }}
          accessibilityRole="button"
          accessibilityLabel="Share booking"
        >
          <Ionicons name="share-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.contractorInfo}>
        <View style={styles.contractorAvatar}>
          <Text style={styles.contractorInitial}>
            {booking.contractorName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contractorDetails}>
          <Text style={styles.contractorName}>{booking.contractorName}</Text>
          <Text style={styles.address}>{booking.address}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{booking.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{booking.time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="hourglass-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{booking.estimatedDuration}</Text>
        </View>
      </View>

      {booking.specialInstructions && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsLabel}>Special Instructions:</Text>
          <Text style={styles.instructionsText}>{booking.specialInstructions}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.price}>${booking.amount}</Text>
        </View>

        <View style={styles.actions}>
          {booking.status === 'upcoming' && (
            <>
              {booking.canReschedule && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    haptics.buttonPress();
                    onReschedule(booking);
                  }}
                >
                  <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.actionButtonText}>Reschedule</Text>
                </TouchableOpacity>
              )}
              {booking.canCancel && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    haptics.buttonPress();
                    onCancel(booking);
                  }}
                >
                  <Ionicons name="close-outline" size={16} color={theme.colors.error} />
                  <Text style={[styles.actionButtonText, styles.cancelButtonText]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {booking.status === 'completed' && !booking.rating && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                haptics.buttonPress();
                onRate(booking);
              }}
            >
              <Ionicons name="star-outline" size={16} color={theme.colors.ratingGold} />
              <Text style={styles.actionButtonText}>Rate</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => {
              haptics.buttonPress();
              onViewDetails(booking);
            }}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    padding: 4,
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contractorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contractorInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  contractorDetails: {
    flex: 1,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  address: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bookingDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  instructionsContainer: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  priceLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  cancelButton: {
    backgroundColor: theme.colors.errorLight,
  },
  cancelButtonText: {
    color: theme.colors.error,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

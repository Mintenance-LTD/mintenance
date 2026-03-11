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
              name={getStatusIcon(booking.status) as React.ComponentProps<typeof Ionicons>['name']}
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
          <Text style={styles.price}>{'\u00A3'}{booking.amount}</Text>
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
                  <Ionicons name="refresh-outline" size={16} color={theme.colors.textSecondary} />
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
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    ...theme.shadows.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  status: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  shareButton: {
    padding: theme.spacing.xs,
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  contractorAvatar: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  },
  contractorInitial: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textInverse,
  },
  contractorDetails: {
    flex: 1,
  },
  contractorName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  address: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  bookingDetails: {
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  detailText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  instructionsContainer: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing.md,
  },
  instructionsLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  instructionsText: {
    fontSize: theme.typography.fontSize.sm,
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
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  price: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
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
    gap: theme.spacing.xs,
  },
  viewDetailsText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
});

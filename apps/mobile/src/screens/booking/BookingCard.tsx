/**
 * BookingCard Component
 *
 * Airbnb-style booking card with soft shadows, no borders,
 * colored status indicators, and clean action buttons.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from './BookingStatusScreen';
import { useHaptics } from '../../utils/haptics';
import { theme } from '../../theme';

interface BookingCardProps {
  booking: Booking;
  onCancel: (booking: Booking) => void;
  onReschedule: (booking: Booking) => void;
  onRate: (booking: Booking) => void;
  onShare: (booking: Booking) => void;
  onViewDetails: (booking: Booking) => void;
}

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  upcoming:  { text: '#1D4ED8', bg: '#DBEAFE' },
  pending:   { text: '#92400E', bg: '#FEF3C7' },
  completed: { text: '#0F766E', bg: '#CCFBF1' },
  accepted:  { text: '#0F766E', bg: '#CCFBF1' },
  cancelled: { text: '#475569', bg: '#F1F5F9' },
  rejected:  { text: '#991B1B', bg: '#FEE2E2' },
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  upcoming: 'time-outline',
  completed: 'checkmark-circle-outline',
  cancelled: 'close-circle-outline',
};

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancel,
  onReschedule,
  onRate,
  onShare,
  onViewDetails,
}) => {
  const haptics = useHaptics();
  const statusColor = STATUS_COLORS[booking.status] || { text: theme.colors.textSecondary, bg: theme.colors.backgroundSecondary };
  const statusIcon = STATUS_ICONS[booking.status] || 'help-circle-outline';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{booking.serviceName}</Text>
          <View style={[styles.statusChip, { backgroundColor: statusColor.bg }]}>
            <Ionicons name={statusIcon} size={14} color={statusColor.text} />
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => { haptics.buttonPress(); onShare(booking); }}
          accessibilityRole="button"
          accessibilityLabel="Share booking"
        >
          <Ionicons name="share-outline" size={18} color={theme.colors.textSecondary} />
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
          <Ionicons name="calendar-outline" size={15} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{booking.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={15} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{booking.time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="hourglass-outline" size={15} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>{booking.estimatedDuration}</Text>
        </View>
      </View>

      {booking.specialInstructions && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsLabel}>Special Instructions</Text>
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
                  onPress={() => { haptics.buttonPress(); onReschedule(booking); }}
                >
                  <Ionicons name="refresh-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.actionButtonText}>Reschedule</Text>
                </TouchableOpacity>
              )}
              {booking.canCancel && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => { haptics.buttonPress(); onCancel(booking); }}
                >
                  <Ionicons name="close-outline" size={14} color={theme.colors.error} />
                  <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {booking.status === 'completed' && !booking.rating && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => { haptics.buttonPress(); onRate(booking); }}
            >
              <Ionicons name="star-outline" size={14} color={theme.colors.accent} />
              <Text style={styles.actionButtonText}>Rate</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => { haptics.buttonPress(); onViewDetails(booking); }}
          >
            <Text style={styles.viewDetailsText}>Details</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
    gap: 6,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  contractorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contractorInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  contractorDetails: {
    flex: 1,
  },
  contractorName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  address: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  bookingDetails: {
    marginBottom: 14,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  instructionsContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  instructionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 19,
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
    fontSize: 11,
    color: theme.colors.textTertiary,
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
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
  },
  cancelButtonText: {
    color: theme.colors.error,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

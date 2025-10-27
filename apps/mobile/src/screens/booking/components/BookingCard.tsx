/**
 * Booking Card Component
 *
 * Displays individual booking information with status-specific actions.
 * Handles different booking states (upcoming, completed, cancelled).
 *
 * @filesize Target: <400 lines
 * @compliance Architecture principles - Single responsibility
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { StatusPill } from '../../../components/StatusPill';
import type { Booking } from '../viewmodels/BookingViewModel';

interface BookingCardProps {
  booking: Booking;
  onContactContractor: (booking: Booking) => void;
  onShareBooking: (booking: Booking) => void;
  onReschedule: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onViewReceipt: (booking: Booking) => void;
  onLeaveReview: (booking: Booking) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onContactContractor,
  onShareBooking,
  onReschedule,
  onCancel,
  onViewReceipt,
  onLeaveReview,
}) => {
  const getStatusColor = () => {
    switch (booking.status) {
      case 'completed':
        return {
          backgroundColor: theme.colors.success,
          textColor: 'white',
        };
      case 'upcoming':
        return {
          backgroundColor: theme.colors.warning,
          textColor: 'white',
        };
      case 'cancelled':
        return {
          backgroundColor: theme.colors.error,
          textColor: 'white',
        };
      default:
        return {
          backgroundColor: theme.colors.textSecondary,
          textColor: 'white',
        };
    }
  };

  const handleContactPress = () => {
    Alert.alert(
      'Contact Contractor',
      `How would you like to contact ${booking.contractorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => handleCall() },
        { text: 'Message', onPress: () => handleMessage() },
      ]
    );
  };

  const handleCall = () => {
    Alert.alert('Calling', `Calling ${booking.contractorName}...`);
  };

  const handleMessage = () => {
    onContactContractor(booking);
  };

  const renderRatingStars = () => {
    if (!booking.rating) return null;

    return (
      <View style={styles.ratingStars}>
        {[...Array(5)].map((_, i) => (
          <Ionicons
            key={i}
            name={i < Math.floor(booking.rating!) ? 'star' : 'star-outline'}
            size={14}
            color="#FFD700"
          />
        ))}
        <Text style={styles.ratingText}>{booking.rating.toFixed(1)}</Text>
      </View>
    );
  };

  const renderUpcomingActions = () => (
    <>
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleContactPress}
        >
          <Ionicons
            name="chatbubble-outline"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.secondaryButtonText}>Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => onShareBooking(booking)}
        >
          <Ionicons
            name="share-outline"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.secondaryButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtonsRow}>
        {booking.canReschedule && (
          <TouchableOpacity
            style={[styles.actionButton, styles.rescheduleButton]}
            onPress={() => onReschedule(booking)}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={theme.colors.info}
            />
            <Text style={styles.rescheduleButtonText}>Reschedule</Text>
          </TouchableOpacity>
        )}

        {booking.canCancel && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => onCancel(booking)}
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color={theme.colors.error}
            />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const renderCompletedActions = () => (
    <>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => onViewReceipt(booking)}
      >
        <Text style={styles.actionButtonText}>View E-Receipt</Text>
      </TouchableOpacity>

      {booking.rating && (
        <View style={styles.ratingContainer}>
          {renderRatingStars()}
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => onLeaveReview(booking)}
          >
            <Text style={styles.reviewButtonText}>Leave Review</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const statusColor = getStatusColor();

  return (
    <View style={styles.container}>
      {/* Booking Header */}
      <View style={styles.header}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingDate}>
            {booking.date} - {booking.time}
          </Text>

          <View style={styles.contractorRow}>
            <View style={styles.contractorIcon}>
              <Ionicons name="person" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.contractorDetails}>
              <Text accessibilityLabel="Contractor name" style={styles.contractorName}>
                {booking.contractorName}
              </Text>
              <View style={styles.serviceRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.serviceAddress}>{booking.address}</Text>
              </View>
              <View style={styles.serviceRow}>
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.serviceId}>
                  Service ID: {booking.serviceId}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <StatusPill status={booking.status} />
      </View>

      {/* Service Details */}
      <View style={styles.serviceDetails}>
        <Text style={styles.serviceName}>{booking.serviceName}</Text>
        <View style={styles.serviceMetaRow}>
          <View style={styles.serviceMeta}>
            <Ionicons
              name="time-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.serviceMetaText}>
              {booking.estimatedDuration}
            </Text>
          </View>
          <View style={styles.serviceMeta}>
            <Ionicons
              name="cash-outline"
              size={16}
              color={theme.colors.success}
            />
            <Text style={styles.serviceMetaText}>
              ${booking.amount.toFixed(2)}
            </Text>
          </View>
        </View>

        {booking.specialInstructions && (
          <View style={styles.instructionsContainer}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={theme.colors.info}
            />
            <Text style={styles.instructionsText}>
              {booking.specialInstructions}
            </Text>
          </View>
        )}
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: statusColor.backgroundColor }
        ]}
      >
        <Text
          style={[
            styles.statusText,
            { color: statusColor.textColor }
          ]}
        >
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {booking.status === 'upcoming' && renderUpcomingActions()}
        {booking.status === 'completed' && renderCompletedActions()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  contractorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contractorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  contractorDetails: {
    flex: 1,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  serviceAddress: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  serviceId: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  serviceDetails: {
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceMetaText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginLeft: 6,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actions: {
    gap: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  rescheduleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.info,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rescheduleButtonText: {
    color: theme.colors.info,
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginLeft: 6,
  },
  reviewButton: {
    backgroundColor: theme.colors.info,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

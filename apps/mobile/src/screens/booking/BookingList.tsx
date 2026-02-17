/**
 * BookingList Component
 * 
 * Displays the list of bookings for the selected tab with action buttons.
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Booking } from './BookingStatusScreen';
import { BookingCard } from './BookingCard';

interface BookingListProps {
  bookings: Booking[];
  onCancel: (booking: Booking) => void;
  onReschedule: (booking: Booking) => void;
  onRate: (booking: Booking) => void;
  onShare: (booking: Booking) => void;
  onViewDetails: (booking: Booking) => void;
}

export const BookingList: React.FC<BookingListProps> = ({
  bookings,
  onCancel,
  onReschedule,
  onRate,
  onShare,
  onViewDetails,
}) => {
  return (
    <FlatList
      style={styles.container}
      data={bookings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <BookingCard
          booking={item}
          onCancel={onCancel}
          onReschedule={onReschedule}
          onRate={onRate}
          onShare={onShare}
          onViewDetails={onViewDetails}
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.contentContainer,
        bookings.length === 0 && styles.emptyContentContainer,
      ]}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons
            name="calendar-outline"
            size={64}
            color={theme.colors.textTertiary}
            accessible={false}
          />
          <Text style={styles.emptyTitle}>No bookings found</Text>
          <Text style={styles.emptySubtitle}>
            Your bookings will appear here once you have them
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: 20,
    gap: 12,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

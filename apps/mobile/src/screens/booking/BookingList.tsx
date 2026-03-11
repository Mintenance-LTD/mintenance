/**
 * BookingList Component
 *
 * Displays bookings in a clean list with Airbnb-style empty state.
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={32} color="#717171" accessible={false} />
          </View>
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
    backgroundColor: '#F7F7F7',
  },
  contentContainer: {
    padding: 16,
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
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    lineHeight: 20,
  },
});

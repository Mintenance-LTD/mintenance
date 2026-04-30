/**
 * BookingList Component
 *
 * Displays bookings in a clean list with Airbnb-style empty state.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Booking } from './BookingStatusScreen';
import { BookingCard } from './BookingCard';
import { goToTab } from '../../navigation/hooks';
import { theme } from '../../theme';

interface BookingListProps {
  bookings: Booking[];
  onCancel: (booking: Booking) => void;
  onReschedule: (booking: Booking) => void;
  onRate: (booking: Booking) => void;
  onShare: (booking: Booking) => void;
  onViewDetails: (booking: Booking) => void;
}

const EmptyBookingsState = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons
          name='calendar-outline'
          size={32}
          color={theme.colors.textSecondary}
          accessible={false}
        />
      </View>
      <Text style={styles.emptyTitle}>No bookings found</Text>
      <Text style={styles.emptySubtitle}>
        Your bookings will appear here once you schedule services
      </Text>
      <TouchableOpacity
        style={styles.emptyCta}
        onPress={() => goToTab(navigation, 'HomeTab')}
        accessibilityRole='button'
      >
        <Text style={styles.emptyCtaText}>Find Services</Text>
      </TouchableOpacity>
    </View>
  );
};

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
      ListEmptyComponent={<EmptyBookingsState />}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
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
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCtaText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});

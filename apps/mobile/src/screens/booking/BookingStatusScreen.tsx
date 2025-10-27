/**
 * BookingStatusScreen Container
 * 
 * Main container component that orchestrates the booking status functionality
 * and manages the overall state and navigation.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';
import { BookingTabs } from './BookingTabs';
import { BookingList } from './BookingList';
import { BookingLoading } from './BookingLoading';
import { BookingError } from './BookingError';
import { CancellationModal } from './CancellationModal';
import { BookingService } from './BookingService';

interface BookingStatusParams {
  jobId?: string;
}

interface Props {
  route?: RouteProp<{ params: BookingStatusParams }>;
  navigation: StackNavigationProp<any>;
}

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  contractorName: string;
  contractorImage?: string;
  serviceName: string;
  address: string;
  serviceId: string;
  date: string;
  time: string;
  status: BookingStatus;
  amount: number;
  rating?: number;
  canCancel: boolean;
  canReschedule: boolean;
  estimatedDuration: string;
  specialInstructions?: string;
}

import { RootStackParamList } from '../../navigation/types';

export const BookingStatusScreen: React.FC<{
  route?: RouteProp<{ params: BookingStatusParams }>;
  navigation: StackNavigationProp<RootStackParamList>;
}> = ({ navigation }) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<BookingStatus>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
  }, [user]);

  const loadBookings = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookingService = new BookingService();
      const allBookings = await bookingService.loadUserBookings(user);
      setBookings(allBookings);
    } catch (err) {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedBooking) return;

    try {
      const bookingService = new BookingService();
      const prev = bookings;
      // optimistic update
      setBookings(prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'cancelled' } as Booking : b));
      await bookingService.cancelBooking(selectedBooking.id, reason);
      setShowCancelModal(false);
      setSelectedBooking(null);
    } catch (err) {
      // rollback on failure
      setBookings(prev => prev);
      setShowCancelModal(true);
    }
  };

  const handleRescheduleBooking = (booking: Booking) => {
    // Navigation logic would be handled here
    navigation.navigate('RescheduleBooking', { bookingId: booking.id });
  };

  const handleRateBooking = (booking: Booking) => {
    navigation.navigate('RateBooking', { bookingId: booking.id });
  };

  const handleShareBooking = (booking: Booking) => {
    // Share logic would be handled here
  };

  const handleViewBookingDetails = (booking: Booking) => {
    navigation.navigate('BookingDetails', { bookingId: booking.id });
  };

  // Loading state
  if (loading) {
    return <BookingLoading />;
  }

  // Error state
  if (error) {
    return (
      <BookingError 
        error={error} 
        onRetry={loadBookings} 
      />
    );
  }

  // Filter bookings by active tab
  const filteredBookings = bookings.filter(booking => booking.status === activeTab);

  return (
    <View style={styles.container}>
      {loading && <BookingLoading />}
      {!loading && error && (
        <BookingError message={error} onRetry={loadBookings} />
      )}
      {!loading && !error && bookings.filter(b => b.status === activeTab).length === 0 && (
        <View accessibilityRole="summary" style={{ padding: 24 }}>
          <Text style={{ color: theme.colors.textSecondary }}>
            {activeTab === 'upcoming' && 'No upcoming bookings yet. Browse services to get started.'}
            {activeTab === 'completed' && 'No completed bookings yet.'}
            {activeTab === 'cancelled' && 'No cancelled bookings.'}
          </Text>
        </View>
      )}
      <BookingTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        bookings={bookings}
      />

      <BookingList
        bookings={filteredBookings}
        onCancel={handleCancelBooking}
        onReschedule={handleRescheduleBooking}
        onRate={handleRateBooking}
        onShare={handleShareBooking}
        onViewDetails={handleViewBookingDetails}
      />

      <CancellationModal
        visible={showCancelModal}
        booking={selectedBooking}
        onConfirm={handleCancelConfirm}
        onCancel={() => {
          setShowCancelModal(false);
          setSelectedBooking(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

export default BookingStatusScreen;

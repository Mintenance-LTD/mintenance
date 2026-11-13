/**
 * BookingStatusScreen Container
 *
 * Main container component that orchestrates the booking status functionality
 * and manages the overall state and navigation.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { MintScreenBackBar } from '../../components/shared';
import { BookingTabs } from './BookingTabs';
import { BookingList } from './BookingList';
import { BookingLoading } from './BookingLoading';
import { BookingError } from './BookingError';
import { CancellationModal } from './CancellationModal';
import { BookingService } from './BookingService';

import type { ProfileStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';

interface BookingStatusParams {
  jobId?: string;
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

export const BookingStatusScreen: React.FC<{
  route?: RouteProp<{ params: BookingStatusParams }>;
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'BookingStatus'>;
}> = ({ navigation }) => {
  const { user } = useAuth();
  const accountId = user?.id;
  const accountRole = user?.role;
  const currentAccount = useRef(accountId);
  currentAccount.current = accountId;
  const requestVersion = useRef(0);
  const cancelling = useRef(false);

  const [activeTab, setActiveTab] = useState<BookingStatus>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const loadBookings = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!accountId || !accountRole) {
      setBookings([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookingService = new BookingService();
      const allBookings = await bookingService.loadUserBookings({ id: accountId, role: accountRole });
      if (version === requestVersion.current && currentAccount.current === accountId) setBookings(allBookings);
    } catch {
      if (version === requestVersion.current && currentAccount.current === accountId) setError('Failed to load bookings');
    } finally {
      if (version === requestVersion.current && currentAccount.current === accountId) setLoading(false);
    }
  }, [accountId, accountRole]);

  useEffect(() => {
    cancelling.current = false;
    setBookings([]);
    setSelectedBooking(null);
    setShowCancelModal(false);
    void loadBookings();
    return () => { requestVersion.current++; };
  }, [loadBookings]);

  const handleCancelBooking = (booking: Booking) => {
    if (cancelling.current) return;
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedBooking || !accountId || cancelling.current) return;
    cancelling.current = true;
    const originalBooking = selectedBooking;
    const version = requestVersion.current;

    try {
      const bookingService = new BookingService();
      // optimistic update
      setBookings((prev) =>
        prev.map((b) =>
          b.id === selectedBooking.id
            ? ({ ...b, status: 'cancelled' } as Booking)
            : b
        )
      );
      await bookingService.cancelBooking(selectedBooking.id, reason);
      if (version !== requestVersion.current || currentAccount.current !== accountId) return;
      setShowCancelModal(false);
      setSelectedBooking(null);
    } catch {
      if (version !== requestVersion.current || currentAccount.current !== accountId) return;
      // rollback on failure
      setBookings((prev) => prev.map((booking) => booking.id === originalBooking.id ? originalBooking : booking));
      setShowCancelModal(true);
      Alert.alert('Unable to cancel booking', 'We could not confirm the cancellation. Please try again.');
    } finally {
      if (version === requestVersion.current) cancelling.current = false;
    }
  };

  const handleRescheduleBooking = (booking: Booking) => {
    (
      navigation as {
        navigate: (screen: string, params?: Record<string, unknown>) => void;
      }
    ).navigate('RescheduleBooking', { bookingId: booking.id });
  };

  const handleRateBooking = (booking: Booking) => {
    (
      navigation as {
        navigate: (screen: string, params?: Record<string, unknown>) => void;
      }
    ).navigate('RateBooking', { bookingId: booking.id });
  };

  const handleShareBooking = (_booking: Booking) => {
    // Share logic would be handled here
  };

  const handleViewBookingDetails = (booking: Booking) => {
    (
      navigation as {
        navigate: (screen: string, params?: Record<string, unknown>) => void;
      }
    ).navigate('BookingDetails', { bookingId: booking.id });
  };

  // Loading state
  if (loading) {
    return <BookingLoading />;
  }

  // Error state
  if (error) {
    return <BookingError error={error} onRetry={loadBookings} />;
  }

  // Filter bookings by active tab
  const filteredBookings = bookings.filter(
    (booking) => booking.status === activeTab
  );

  return (
    <SafeAreaView style={styles.container}>
      <MintScreenBackBar
        title='Bookings'
        fallbackScreen='ProfileMain'
        withTopInset={false}
      />
      {loading && <BookingLoading />}
      {!loading && error && (
        <BookingError error={error} onRetry={loadBookings} />
      )}
      {!loading &&
        !error &&
        bookings.filter((b) => b.status === activeTab).length === 0 && (
          <View accessibilityRole='summary' style={{ padding: 24 }}>
            <Text style={{ color: me.ink2 }}>
              {activeTab === 'upcoming' &&
                'No upcoming bookings yet. Browse services to get started.'}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
});

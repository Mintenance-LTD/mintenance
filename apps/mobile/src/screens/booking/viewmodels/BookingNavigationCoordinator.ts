/**
 * Booking Navigation Coordinator
 *
 * Handles all navigation logic for the BookingStatus screen.
 * Separates navigation concerns from business logic.
 *
 * @filesize Target: <150 lines
 * @compliance Architecture principles - Coordinator pattern
 */

import { NavigationProp } from '@react-navigation/native';
import { Share } from 'react-native';
import { useHaptics } from '../../../utils/haptics';
import { logger } from '../../../utils/logger';
import type { Booking } from './BookingViewModel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNavigation = NavigationProp<Record<string, object | undefined>>;

interface BookingNavigationActions {
  goBack: () => void;
  openSearch: () => void;
  openBookingDetails: (bookingId: string) => void;
  openContractorProfile: (contractorId: string) => void;
  openReschedule: (booking: Booking) => void;
  openReview: (booking: Booking) => void;
  openSupport: () => void;
  shareBooking: (booking: Booking) => Promise<void>;
}

/**
 * Navigation coordinator for BookingStatus screen
 */
export class BookingNavigationCoordinator implements BookingNavigationActions {
  private navigation: AnyNavigation;
  private haptics: ReturnType<typeof useHaptics>;

  constructor(
    navigation: AnyNavigation,
    haptics: ReturnType<typeof useHaptics>
  ) {
    this.navigation = navigation;
    this.haptics = haptics;
  }

  /**
   * Navigate back to previous screen
   */
  goBack = () => {
    this.haptics.selection();
    this.navigation.goBack();
  };

  /**
   * Open the bookings/jobs list as the search/browse target.
   * 2026-04-30 audit: there is no `BookingSearch` modal registered. Until
   * a dedicated booking-search surface exists, route to the canonical
   * jobs list so the button doesn't dead-end.
   */
  openSearch = () => {
    this.haptics.light();
    this.navigation.navigate('JobsTab', { screen: 'JobsList' });
  };

  /**
   * Navigate to booking details screen
   */
  openBookingDetails = (bookingId: string) => {
    this.haptics.selection();
    this.navigation.navigate('BookingDetails', { bookingId });
  };

  /**
   * Navigate to contractor profile
   */
  openContractorProfile = (contractorId: string) => {
    this.haptics.selection();
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'ContractorProfile',
      params: { contractorId },
    });
  };

  /**
   * Navigate to reschedule booking screen.
   * 2026-04-30 audit: `RescheduleBooking` lives on the root stack and
   * expects `{ bookingId: string }`, not a full `booking` object stuffed
   * into a modal stack. Route via the root parent and pass the id only.
   */
  openReschedule = (booking: Booking) => {
    this.haptics.light();
    this.navigation
      .getParent?.()
      ?.getParent?.()
      ?.navigate('RescheduleBooking', { bookingId: booking.id });
  };

  /**
   * Navigate to the rate-booking flow.
   * 2026-04-30 audit: `LeaveReview` is not a registered modal — the
   * canonical post-job review surface is the root `RateBooking` screen.
   */
  openReview = (booking: Booking) => {
    this.haptics.light();
    this.navigation
      .getParent?.()
      ?.getParent?.()
      ?.navigate('RateBooking', { bookingId: booking.id });
  };

  /**
   * Navigate to support/help center.
   * 2026-04-30 audit: HelpCenter is registered under the profile stack,
   * not the modal stack — open it via the ProfileTab.
   */
  openSupport = () => {
    this.haptics.selection();
    this.navigation.navigate('ProfileTab', {
      screen: 'HelpCenter',
    });
  };

  /**
   * Share booking details via native share dialog
   */
  shareBooking = async (booking: Booking) => {
    try {
      this.haptics.light();

      const shareContent = {
        title: 'Booking Details',
        message:
          `${booking.serviceName} with ${booking.contractorName}\n` +
          `Date: ${booking.date} at ${booking.time}\n` +
          `Address: ${booking.address}\n` +
          `Service ID: ${booking.serviceId}`,
      };

      await Share.share(shareContent);
      logger.info('Booking shared successfully', { bookingId: booking.id });
    } catch (error) {
      logger.error('Error sharing booking:', error);
    }
  };
}

/**
 * Custom hook for Booking navigation
 */
const useBookingNavigation = (
  navigation: AnyNavigation
): BookingNavigationActions => {
  const haptics = useHaptics();
  const coordinator = new BookingNavigationCoordinator(navigation, haptics);

  return {
    goBack: coordinator.goBack,
    openSearch: coordinator.openSearch,
    openBookingDetails: coordinator.openBookingDetails,
    openContractorProfile: coordinator.openContractorProfile,
    openReschedule: coordinator.openReschedule,
    openReview: coordinator.openReview,
    openSupport: coordinator.openSupport,
    shareBooking: coordinator.shareBooking,
  };
};

/**
 * Navigation route definitions for type safety
 */
type BookingNavigationRoutes = {
  BookingSearch: undefined;
  BookingDetails: { bookingId: string };
  ContractorProfile: { contractorId: string };
  RescheduleBooking: { booking: Booking };
  LeaveReview: { booking: Booking };
  HelpCenter: undefined;
};

// Re-export AnyNavigation type alias for external usage

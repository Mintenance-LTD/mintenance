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

export interface BookingNavigationActions {
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
  private navigation: NavigationProp<any>;
  private haptics: ReturnType<typeof useHaptics>;

  constructor(
    navigation: NavigationProp<any>,
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
   * Open booking search/filter screen
   */
  openSearch = () => {
    this.haptics.impact('light');
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'BookingSearch'
    });
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
      params: { contractorId }
    });
  };

  /**
   * Navigate to reschedule booking screen
   */
  openReschedule = (booking: Booking) => {
    this.haptics.impact('light');
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'RescheduleBooking',
      params: { booking }
    });
  };

  /**
   * Navigate to leave review screen
   */
  openReview = (booking: Booking) => {
    this.haptics.impact('light');
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'LeaveReview',
      params: { booking }
    });
  };

  /**
   * Navigate to support/help center
   */
  openSupport = () => {
    this.haptics.selection();
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'HelpCenter'
    });
  };

  /**
   * Share booking details via native share dialog
   */
  shareBooking = async (booking: Booking) => {
    try {
      this.haptics.impact('light');

      const shareContent = {
        title: 'Booking Details',
        message: `${booking.serviceName} with ${booking.contractorName}\n` +
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
export const useBookingNavigation = (
  navigation: NavigationProp<any>
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
export type BookingNavigationRoutes = {
  BookingSearch: undefined;
  BookingDetails: { bookingId: string };
  ContractorProfile: { contractorId: string };
  RescheduleBooking: { booking: Booking };
  LeaveReview: { booking: Booking };
  HelpCenter: undefined;
};
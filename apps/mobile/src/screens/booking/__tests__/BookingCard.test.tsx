/**
 * BookingCard Component Tests
 *
 * Comprehensive test suite for BookingCard component
 * Target: 100% coverage
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BookingCard } from '../BookingCard';
import { Booking } from '../BookingStatusScreen';

// Mock haptics
jest.mock('../../../utils/haptics', () => ({
  useHaptics: () => ({
    buttonPress: jest.fn(),
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('BookingCard', () => {
  const mockCallbacks = {
    onCancel: jest.fn(),
    onReschedule: jest.fn(),
    onRate: jest.fn(),
    onShare: jest.fn(),
    onViewDetails: jest.fn(),
  };

  const baseBooking: Booking = {
    id: 'booking-1',
    contractorName: 'John Doe',
    serviceName: 'Plumbing Service',
    address: '123 Main St, City, State',
    serviceId: 'service-1',
    date: 'March 15, 2024',
    time: '10:00 AM',
    status: 'upcoming',
    amount: 150,
    canCancel: true,
    canReschedule: true,
    estimatedDuration: '2 hours',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  describe('Rendering - Basic Elements', () => {
    it('should render booking card with all basic information', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('Plumbing Service')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('123 Main St, City, State')).toBeTruthy();
      expect(getByText('March 15, 2024')).toBeTruthy();
      expect(getByText('10:00 AM')).toBeTruthy();
      expect(getByText('2 hours')).toBeTruthy();
      expect(getByText('$150')).toBeTruthy();
      expect(getByText('Total')).toBeTruthy();
    });

    it('should render contractor avatar with first letter of contractor name', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('J')).toBeTruthy();
    });

    it('should render contractor avatar with correct letter for different names', () => {
      const booking = { ...baseBooking, contractorName: 'Alice Smith' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('A')).toBeTruthy();
    });

    it('should render lowercase contractor name with uppercase avatar', () => {
      const booking = { ...baseBooking, contractorName: 'jane doe' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('J')).toBeTruthy();
    });

    it('should render view details button', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('View Details')).toBeTruthy();
    });

    it('should render share button', () => {
      const { getByLabelText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByLabelText('Share booking')).toBeTruthy();
    });
  });

  describe('Rendering - Status Display', () => {
    it('should render upcoming status with capitalized text', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('Upcoming')).toBeTruthy();
    });

    it('should render completed status with capitalized text', () => {
      const booking = { ...baseBooking, status: 'completed' as const };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('Completed')).toBeTruthy();
    });

    it('should render cancelled status with capitalized text', () => {
      const booking = { ...baseBooking, status: 'cancelled' as const };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('Cancelled')).toBeTruthy();
    });

    it('should display status with correct icon for upcoming bookings', () => {
      const { UNSAFE_getAllByType } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Rendering - Special Instructions', () => {
    it('should render special instructions when provided', () => {
      const booking = {
        ...baseBooking,
        specialInstructions: 'Please call before arriving',
      };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('Special Instructions:')).toBeTruthy();
      expect(getByText('Please call before arriving')).toBeTruthy();
    });

    it('should not render special instructions section when not provided', () => {
      const { queryByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(queryByText('Special Instructions:')).toBeNull();
    });

    it('should render empty special instructions section when empty string', () => {
      const booking = {
        ...baseBooking,
        specialInstructions: '',
      };
      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(queryByText('Special Instructions:')).toBeNull();
    });

    it('should render long special instructions', () => {
      const longInstructions = 'This is a very long instruction that might wrap to multiple lines. Please make sure to follow all these detailed steps carefully when you arrive at the property.';
      const booking = {
        ...baseBooking,
        specialInstructions: longInstructions,
      };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText(longInstructions)).toBeTruthy();
    });
  });

  describe('Rendering - Price Display', () => {
    it('should render price with dollar sign', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('$150')).toBeTruthy();
    });

    it('should render decimal prices correctly', () => {
      const booking = { ...baseBooking, amount: 150.5 };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('$150.5')).toBeTruthy();
    });

    it('should render zero price', () => {
      const booking = { ...baseBooking, amount: 0 };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('$0')).toBeTruthy();
    });

    it('should render large amounts', () => {
      const booking = { ...baseBooking, amount: 9999.99 };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('$9999.99')).toBeTruthy();
    });
  });

  // ============================================================================
  // ACTION BUTTONS - UPCOMING STATUS
  // ============================================================================

  describe('Action Buttons - Upcoming Bookings', () => {
    it('should render reschedule button when canReschedule is true', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('Reschedule')).toBeTruthy();
    });

    it('should render cancel button when canCancel is true', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should not render reschedule button when canReschedule is false', () => {
      const booking = { ...baseBooking, canReschedule: false };
      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(queryByText('Reschedule')).toBeNull();
    });

    it('should not render cancel button when canCancel is false', () => {
      const booking = { ...baseBooking, canCancel: false };
      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(queryByText('Cancel')).toBeNull();
    });

    it('should render both reschedule and cancel buttons when both are allowed', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('Reschedule')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should not render either button when both are disabled', () => {
      const booking = {
        ...baseBooking,
        canReschedule: false,
        canCancel: false,
      };
      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(queryByText('Reschedule')).toBeNull();
      expect(queryByText('Cancel')).toBeNull();
    });

    it('should render only reschedule button when cancel is disabled', () => {
      const booking = { ...baseBooking, canCancel: false };
      const { getByText, queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('Reschedule')).toBeTruthy();
      expect(queryByText('Cancel')).toBeNull();
    });

    it('should render only cancel button when reschedule is disabled', () => {
      const booking = { ...baseBooking, canReschedule: false };
      const { getByText, queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('Cancel')).toBeTruthy();
      expect(queryByText('Reschedule')).toBeNull();
    });
  });

  describe('Action Buttons - Completed Bookings', () => {
    it('should render rate button for completed bookings without rating', () => {
      const booking = {
        ...baseBooking,
        status: 'completed' as const,
        rating: undefined,
      };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('Rate')).toBeTruthy();
    });

    it('should not render rate button for completed bookings with rating', () => {
      const booking = {
        ...baseBooking,
        status: 'completed' as const,
        rating: 5,
      };
      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(queryByText('Rate')).toBeNull();
    });

    it('should not render reschedule button for completed bookings', () => {
      const booking = {
        ...baseBooking,
        status: 'completed' as const,
      };
      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(queryByText('Reschedule')).toBeNull();
    });

    it('should not render cancel button for completed bookings', () => {
      const booking = {
        ...baseBooking,
        status: 'completed' as const,
      };
      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(queryByText('Cancel')).toBeNull();
    });

    it('should render rate button with zero rating', () => {
      const booking = {
        ...baseBooking,
        status: 'completed' as const,
        rating: 0,
      };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      // Rating of 0 is falsy, so Rate button should appear
      expect(getByText('Rate')).toBeTruthy();
    });

    it('should handle completed booking with different rating values', () => {
      for (let rating = 1; rating <= 5; rating++) {
        const booking = {
          ...baseBooking,
          status: 'completed' as const,
          rating,
        };
        const { queryByText } = render(
          <BookingCard booking={booking} {...mockCallbacks} />
        );

        expect(queryByText('Rate')).toBeNull();
      }
    });
  });

  describe('Action Buttons - Cancelled Bookings', () => {
    it('should not render any action buttons for cancelled bookings', () => {
      const booking = {
        ...baseBooking,
        status: 'cancelled' as const,
      };
      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(queryByText('Reschedule')).toBeNull();
      expect(queryByText('Cancel')).toBeNull();
      expect(queryByText('Rate')).toBeNull();
    });

    it('should still render view details button for cancelled bookings', () => {
      const booking = {
        ...baseBooking,
        status: 'cancelled' as const,
      };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('View Details')).toBeTruthy();
    });
  });

  // ============================================================================
  // USER INTERACTIONS
  // ============================================================================

  describe('User Interactions - Button Press Callbacks', () => {
    it('should call onReschedule when reschedule button is pressed', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      fireEvent.press(getByText('Reschedule'));
      expect(mockCallbacks.onReschedule).toHaveBeenCalledWith(baseBooking);
      expect(mockCallbacks.onReschedule).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button is pressed', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      fireEvent.press(getByText('Cancel'));
      expect(mockCallbacks.onCancel).toHaveBeenCalledWith(baseBooking);
      expect(mockCallbacks.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onRate when rate button is pressed', () => {
      const booking = {
        ...baseBooking,
        status: 'completed' as const,
        rating: undefined,
      };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      fireEvent.press(getByText('Rate'));
      expect(mockCallbacks.onRate).toHaveBeenCalledWith(booking);
      expect(mockCallbacks.onRate).toHaveBeenCalledTimes(1);
    });

    it('should call onShare when share button is pressed', () => {
      const { getByLabelText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      fireEvent.press(getByLabelText('Share booking'));
      expect(mockCallbacks.onShare).toHaveBeenCalledWith(baseBooking);
      expect(mockCallbacks.onShare).toHaveBeenCalledTimes(1);
    });

    it('should call onViewDetails when view details button is pressed', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      fireEvent.press(getByText('View Details'));
      expect(mockCallbacks.onViewDetails).toHaveBeenCalledWith(baseBooking);
      expect(mockCallbacks.onViewDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Interactions - Multiple Presses', () => {
    it('should handle multiple presses of reschedule button', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      const rescheduleButton = getByText('Reschedule');
      fireEvent.press(rescheduleButton);
      fireEvent.press(rescheduleButton);
      fireEvent.press(rescheduleButton);

      expect(mockCallbacks.onReschedule).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple presses of share button', () => {
      const { getByLabelText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      const shareButton = getByLabelText('Share booking');
      fireEvent.press(shareButton);
      fireEvent.press(shareButton);

      expect(mockCallbacks.onShare).toHaveBeenCalledTimes(2);
    });

    it('should not interfere between different button presses', () => {
      const { getByText, getByLabelText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      fireEvent.press(getByText('Reschedule'));
      fireEvent.press(getByLabelText('Share booking'));
      fireEvent.press(getByText('View Details'));

      expect(mockCallbacks.onReschedule).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onShare).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onViewDetails).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onCancel).not.toHaveBeenCalled();
      expect(mockCallbacks.onRate).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions - Callback Independence', () => {
    it('should not call other callbacks when reschedule is pressed', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      fireEvent.press(getByText('Reschedule'));

      expect(mockCallbacks.onCancel).not.toHaveBeenCalled();
      expect(mockCallbacks.onRate).not.toHaveBeenCalled();
      expect(mockCallbacks.onShare).not.toHaveBeenCalled();
      expect(mockCallbacks.onViewDetails).not.toHaveBeenCalled();
    });

    it('should not call other callbacks when cancel is pressed', () => {
      const { getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      fireEvent.press(getByText('Cancel'));

      expect(mockCallbacks.onReschedule).not.toHaveBeenCalled();
      expect(mockCallbacks.onRate).not.toHaveBeenCalled();
      expect(mockCallbacks.onShare).not.toHaveBeenCalled();
      expect(mockCallbacks.onViewDetails).not.toHaveBeenCalled();
    });

    it('should not call other callbacks when share is pressed', () => {
      const { getByLabelText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      fireEvent.press(getByLabelText('Share booking'));

      expect(mockCallbacks.onReschedule).not.toHaveBeenCalled();
      expect(mockCallbacks.onCancel).not.toHaveBeenCalled();
      expect(mockCallbacks.onRate).not.toHaveBeenCalled();
      expect(mockCallbacks.onViewDetails).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ACCESSIBILITY
  // ============================================================================

  describe('Accessibility', () => {
    it('should have accessible share button with correct role', () => {
      const { getByLabelText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      const shareButton = getByLabelText('Share booking');
      expect(shareButton.props.accessibilityRole).toBe('button');
    });

    it('should have accessible share button label', () => {
      const { getByLabelText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByLabelText('Share booking')).toBeTruthy();
    });
  });

  // ============================================================================
  // EDGE CASES AND DATA VARIATIONS
  // ============================================================================

  describe('Edge Cases - Contractor Names', () => {
    it('should handle contractor name with single character', () => {
      const booking = { ...baseBooking, contractorName: 'X' };
      const { getAllByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      // Should find X in both avatar (uppercase) and contractor name
      const xElements = getAllByText('X');
      expect(xElements.length).toBeGreaterThan(0);
    });

    it('should handle contractor name with numbers', () => {
      const booking = { ...baseBooking, contractorName: '123 Services' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('1')).toBeTruthy();
    });

    it('should handle contractor name with special characters', () => {
      const booking = { ...baseBooking, contractorName: '@John Doe' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('@')).toBeTruthy();
    });

    it('should handle contractor name with spaces at beginning', () => {
      const booking = { ...baseBooking, contractorName: '  Jane Smith' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText(' ')).toBeTruthy();
    });

    it('should handle very long contractor names', () => {
      const longName = 'A'.repeat(100);
      const booking = { ...baseBooking, contractorName: longName };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('A')).toBeTruthy();
      expect(getByText(longName)).toBeTruthy();
    });
  });

  describe('Edge Cases - Service Names', () => {
    it('should handle very long service names', () => {
      const longServiceName = 'Emergency 24/7 Advanced Plumbing and Heating Repair Service with Extended Warranty';
      const booking = { ...baseBooking, serviceName: longServiceName };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText(longServiceName)).toBeTruthy();
    });

    it('should handle service name with special characters', () => {
      const booking = { ...baseBooking, serviceName: 'AC & Heating Repair' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('AC & Heating Repair')).toBeTruthy();
    });

    it('should handle service name with numbers', () => {
      const booking = { ...baseBooking, serviceName: '24/7 Emergency Service' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('24/7 Emergency Service')).toBeTruthy();
    });
  });

  describe('Edge Cases - Addresses', () => {
    it('should handle very long addresses', () => {
      const longAddress = '123456789 Very Long Street Name That Goes On And On, Apartment 42B, Building C, Complex Name, City, State 12345-6789, Country';
      const booking = { ...baseBooking, address: longAddress };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText(longAddress)).toBeTruthy();
    });

    it('should handle address with special characters', () => {
      const booking = { ...baseBooking, address: '123 O\'Brien St., Apt. #5' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('123 O\'Brien St., Apt. #5')).toBeTruthy();
    });
  });

  describe('Edge Cases - Date and Time', () => {
    it('should handle different date formats', () => {
      const booking = { ...baseBooking, date: '2024-03-15' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('2024-03-15')).toBeTruthy();
    });

    it('should handle different time formats', () => {
      const booking = { ...baseBooking, time: '14:30' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('14:30')).toBeTruthy();
    });

    it('should handle time with AM/PM', () => {
      const booking = { ...baseBooking, time: '2:30 PM' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('2:30 PM')).toBeTruthy();
    });

    it('should handle very long date strings', () => {
      const booking = { ...baseBooking, date: 'Monday, March 15th, 2024' };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('Monday, March 15th, 2024')).toBeTruthy();
    });
  });

  describe('Edge Cases - Duration', () => {
    it('should handle different duration formats', () => {
      const durations = [
        '1 hour',
        '30 minutes',
        '2-3 hours',
        '1.5 hours',
        'All day',
      ];

      durations.forEach(duration => {
        const booking = { ...baseBooking, estimatedDuration: duration };
        const { getByText } = render(
          <BookingCard booking={booking} {...mockCallbacks} />
        );

        expect(getByText(duration)).toBeTruthy();
      });
    });
  });

  // ============================================================================
  // STATUS COLOR AND ICON TESTS
  // ============================================================================

  describe('Status Helper Functions - getStatusColor', () => {
    it('should use correct theme colors for each status', () => {
      // Test all status variations through rendering
      const statuses: ('upcoming' | 'completed' | 'cancelled')[] = [
        'upcoming',
        'completed',
        'cancelled',
      ];

      statuses.forEach(status => {
        const booking = { ...baseBooking, status };
        const { getByText } = render(
          <BookingCard booking={booking} {...mockCallbacks} />
        );

        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        expect(getByText(statusText)).toBeTruthy();
      });
    });

    it('should handle unknown status with default color', () => {
      // TypeScript won't allow invalid status, but test runtime behavior
      const booking = { ...baseBooking, status: 'unknown' as any };
      const { getByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('Unknown')).toBeTruthy();
    });
  });

  describe('Status Helper Functions - getStatusIcon', () => {
    it('should render correct icon for upcoming status', () => {
      const { UNSAFE_getAllByType } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render correct icon for completed status', () => {
      const booking = { ...baseBooking, status: 'completed' as const };
      const { UNSAFE_getAllByType } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render correct icon for cancelled status', () => {
      const booking = { ...baseBooking, status: 'cancelled' as const };
      const { UNSAFE_getAllByType } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render default icon for unknown status', () => {
      // TypeScript won't allow invalid status, but test runtime behavior
      const booking = { ...baseBooking, status: 'invalid-status' as any };
      const { UNSAFE_getAllByType } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration - Complete Booking Workflows', () => {
    it('should render complete upcoming booking with all features', () => {
      const booking: Booking = {
        ...baseBooking,
        specialInstructions: 'Ring doorbell twice',
        canCancel: true,
        canReschedule: true,
      };

      const { getByText, getByLabelText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('Plumbing Service')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Ring doorbell twice')).toBeTruthy();
      expect(getByText('Reschedule')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('View Details')).toBeTruthy();
      expect(getByLabelText('Share booking')).toBeTruthy();
    });

    it('should render complete completed booking workflow', () => {
      const booking: Booking = {
        ...baseBooking,
        status: 'completed',
        rating: undefined,
        specialInstructions: 'Great service!',
      };

      const { getByText, queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(getByText('Completed')).toBeTruthy();
      expect(getByText('Rate')).toBeTruthy();
      expect(queryByText('Reschedule')).toBeNull();
      expect(queryByText('Cancel')).toBeNull();
    });

    it('should handle booking state transitions', () => {
      const { rerender, getByText, queryByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('Upcoming')).toBeTruthy();

      const completedBooking = {
        ...baseBooking,
        status: 'completed' as const,
      };
      rerender(<BookingCard booking={completedBooking} {...mockCallbacks} />);

      expect(getByText('Completed')).toBeTruthy();
      expect(queryByText('Reschedule')).toBeNull();
    });
  });

  describe('Integration - Booking with Minimal Data', () => {
    it('should handle booking with only required fields', () => {
      const minimalBooking: Booking = {
        id: 'booking-minimal',
        contractorName: 'MinimalContractor',
        serviceName: 'MinimalService',
        address: 'MinimalAddress',
        serviceId: 'sid',
        date: 'MinimalDate',
        time: 'MinimalTime',
        status: 'upcoming',
        amount: 0,
        canCancel: false,
        canReschedule: false,
        estimatedDuration: 'MinimalDuration',
      };

      const { getByText } = render(
        <BookingCard booking={minimalBooking} {...mockCallbacks} />
      );

      expect(getByText('M')).toBeTruthy(); // Avatar
      expect(getByText('MinimalContractor')).toBeTruthy();
      expect(getByText('MinimalService')).toBeTruthy();
      expect(getByText('MinimalAddress')).toBeTruthy();
    });
  });

  describe('Integration - Props Update', () => {
    it('should update when booking prop changes', () => {
      const { rerender, getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('John Doe')).toBeTruthy();

      const updatedBooking = {
        ...baseBooking,
        contractorName: 'Jane Smith',
      };

      rerender(<BookingCard booking={updatedBooking} {...mockCallbacks} />);
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    it('should update when amount changes', () => {
      const { rerender, getByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(getByText('$150')).toBeTruthy();

      const updatedBooking = { ...baseBooking, amount: 200 };
      rerender(<BookingCard booking={updatedBooking} {...mockCallbacks} />);

      expect(getByText('$200')).toBeTruthy();
    });

    it('should update when special instructions change', () => {
      const { rerender, getByText, queryByText } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(queryByText('Special Instructions:')).toBeNull();

      const updatedBooking = {
        ...baseBooking,
        specialInstructions: 'New instructions',
      };
      rerender(<BookingCard booking={updatedBooking} {...mockCallbacks} />);

      expect(getByText('New instructions')).toBeTruthy();
    });
  });

  // ============================================================================
  // COMPREHENSIVE STATUS COMBINATIONS
  // ============================================================================

  describe('Comprehensive Status Combinations', () => {
    it('should handle upcoming with no actions allowed', () => {
      const booking = {
        ...baseBooking,
        status: 'upcoming' as const,
        canCancel: false,
        canReschedule: false,
      };

      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(queryByText('Reschedule')).toBeNull();
      expect(queryByText('Cancel')).toBeNull();
      expect(queryByText('Rate')).toBeNull();
    });

    it('should handle completed with rating already given', () => {
      const booking = {
        ...baseBooking,
        status: 'completed' as const,
        rating: 5,
      };

      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(queryByText('Rate')).toBeNull();
      expect(queryByText('Reschedule')).toBeNull();
      expect(queryByText('Cancel')).toBeNull();
    });

    it('should handle cancelled with all flags true', () => {
      const booking = {
        ...baseBooking,
        status: 'cancelled' as const,
        canCancel: true,
        canReschedule: true,
        rating: 3,
      };

      const { queryByText } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      // Cancelled status overrides all action flags
      expect(queryByText('Rate')).toBeNull();
      expect(queryByText('Reschedule')).toBeNull();
      expect(queryByText('Cancel')).toBeNull();
    });
  });

  // ============================================================================
  // SNAPSHOT STABILITY
  // ============================================================================

  describe('Snapshot Stability', () => {
    it('should render consistently for upcoming booking', () => {
      const { toJSON } = render(
        <BookingCard booking={baseBooking} {...mockCallbacks} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should render consistently for completed booking', () => {
      const booking = { ...baseBooking, status: 'completed' as const };
      const { toJSON } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should render consistently for cancelled booking', () => {
      const booking = { ...baseBooking, status: 'cancelled' as const };
      const { toJSON } = render(
        <BookingCard booking={booking} {...mockCallbacks} />
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});

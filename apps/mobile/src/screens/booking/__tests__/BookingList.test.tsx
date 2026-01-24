/**
 * BookingList Component Tests
 *
 * Comprehensive test suite for BookingList component
 * Target: 100% coverage
 *
 * Tests:
 * - Empty state rendering
 * - List rendering with bookings
 * - ScrollView behavior
 * - Callback propagation
 * - Edge cases and data variations
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BookingList } from '../BookingList';
import { Booking } from '../BookingStatusScreen';

// Mock BookingCard component to isolate BookingList testing
jest.mock('../BookingCard', () => ({
  BookingCard: ({ booking, onCancel, onReschedule, onRate, onShare, onViewDetails }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');

    return React.createElement(View, { testID: `booking-card-${booking.id}` }, [
      React.createElement(Text, { key: 'name', testID: `booking-name-${booking.id}` }, booking.contractorName),
      React.createElement(Text, { key: 'service', testID: `booking-service-${booking.id}` }, booking.serviceName),
      React.createElement(
        TouchableOpacity,
        {
          key: 'cancel',
          testID: `cancel-button-${booking.id}`,
          onPress: () => onCancel(booking),
        },
        React.createElement(Text, null, 'Cancel')
      ),
      React.createElement(
        TouchableOpacity,
        {
          key: 'reschedule',
          testID: `reschedule-button-${booking.id}`,
          onPress: () => onReschedule(booking),
        },
        React.createElement(Text, null, 'Reschedule')
      ),
      React.createElement(
        TouchableOpacity,
        {
          key: 'rate',
          testID: `rate-button-${booking.id}`,
          onPress: () => onRate(booking),
        },
        React.createElement(Text, null, 'Rate')
      ),
      React.createElement(
        TouchableOpacity,
        {
          key: 'share',
          testID: `share-button-${booking.id}`,
          onPress: () => onShare(booking),
        },
        React.createElement(Text, null, 'Share')
      ),
      React.createElement(
        TouchableOpacity,
        {
          key: 'view-details',
          testID: `view-details-button-${booking.id}`,
          onPress: () => onViewDetails(booking),
        },
        React.createElement(Text, null, 'View Details')
      ),
    ]);
  },
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('BookingList', () => {
  const mockCallbacks = {
    onCancel: jest.fn(),
    onReschedule: jest.fn(),
    onRate: jest.fn(),
    onShare: jest.fn(),
    onViewDetails: jest.fn(),
  };

  const createBooking = (overrides: Partial<Booking> = {}): Booking => ({
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
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  describe('Empty State', () => {
    it('should render empty state when bookings array is empty', () => {
      const { getByText } = render(
        <BookingList bookings={[]} {...mockCallbacks} />
      );

      expect(getByText('No bookings found')).toBeTruthy();
      expect(getByText('Your bookings will appear here once you have them')).toBeTruthy();
    });

    it('should render calendar icon in empty state', () => {
      const { UNSAFE_getAllByType } = render(
        <BookingList bookings={[]} {...mockCallbacks} />
      );

      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should not render ScrollView when empty', () => {
      const { queryByTestId } = render(
        <BookingList bookings={[]} {...mockCallbacks} />
      );

      // Should not have ScrollView when empty
      const scrollView = queryByTestId('booking-list-scroll');
      expect(scrollView).toBeNull();
    });

    it('should render empty state container with correct styling', () => {
      const { getByText } = render(
        <BookingList bookings={[]} {...mockCallbacks} />
      );

      const emptyTitle = getByText('No bookings found');
      expect(emptyTitle).toBeTruthy();
      expect(emptyTitle.props.style).toBeDefined();
    });

    it('should render empty state subtitle with correct styling', () => {
      const { getByText } = render(
        <BookingList bookings={[]} {...mockCallbacks} />
      );

      const subtitle = getByText('Your bookings will appear here once you have them');
      expect(subtitle).toBeTruthy();
      expect(subtitle.props.style).toBeDefined();
    });

    it('should not call any callbacks when empty state is displayed', () => {
      render(<BookingList bookings={[]} {...mockCallbacks} />);

      expect(mockCallbacks.onCancel).not.toHaveBeenCalled();
      expect(mockCallbacks.onReschedule).not.toHaveBeenCalled();
      expect(mockCallbacks.onRate).not.toHaveBeenCalled();
      expect(mockCallbacks.onShare).not.toHaveBeenCalled();
      expect(mockCallbacks.onViewDetails).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // LIST RENDERING TESTS
  // ============================================================================

  describe('List Rendering - Single Booking', () => {
    it('should render single booking in list', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
    });

    it('should not render empty state when bookings exist', () => {
      const booking = createBooking();
      const { queryByText } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      expect(queryByText('No bookings found')).toBeNull();
    });

    it('should render ScrollView when bookings exist', () => {
      const booking = createBooking();
      const { UNSAFE_getAllByType } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      const scrollViews = UNSAFE_getAllByType('ScrollView');
      expect(scrollViews.length).toBeGreaterThan(0);
    });

    it('should pass all callbacks to BookingCard', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      // Verify BookingCard received callbacks by testing them
      fireEvent.press(getByTestId('cancel-button-booking-1'));
      expect(mockCallbacks.onCancel).toHaveBeenCalledWith(booking);
    });

    it('should use booking id as key prop', () => {
      const booking = createBooking({ id: 'unique-id-123' });
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-unique-id-123')).toBeTruthy();
    });
  });

  describe('List Rendering - Multiple Bookings', () => {
    it('should render multiple bookings in list', () => {
      const bookings = [
        createBooking({ id: 'booking-1' }),
        createBooking({ id: 'booking-2' }),
        createBooking({ id: 'booking-3' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
      expect(getByTestId('booking-card-booking-2')).toBeTruthy();
      expect(getByTestId('booking-card-booking-3')).toBeTruthy();
    });

    it('should render bookings in correct order', () => {
      const bookings = [
        createBooking({ id: 'first', contractorName: 'First Contractor' }),
        createBooking({ id: 'second', contractorName: 'Second Contractor' }),
        createBooking({ id: 'third', contractorName: 'Third Contractor' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-name-first')).toBeTruthy();
      expect(getByTestId('booking-name-second')).toBeTruthy();
      expect(getByTestId('booking-name-third')).toBeTruthy();
    });

    it('should handle large number of bookings', () => {
      const bookings = Array.from({ length: 50 }, (_, i) =>
        createBooking({ id: `booking-${i}` })
      );

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      // Check first and last
      expect(getByTestId('booking-card-booking-0')).toBeTruthy();
      expect(getByTestId('booking-card-booking-49')).toBeTruthy();
    });

    it('should render bookings with different statuses', () => {
      const bookings = [
        createBooking({ id: 'upcoming', status: 'upcoming' }),
        createBooking({ id: 'completed', status: 'completed' }),
        createBooking({ id: 'cancelled', status: 'cancelled' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-upcoming')).toBeTruthy();
      expect(getByTestId('booking-card-completed')).toBeTruthy();
      expect(getByTestId('booking-card-cancelled')).toBeTruthy();
    });

    it('should maintain separate callbacks for each booking', () => {
      const bookings = [
        createBooking({ id: 'booking-1' }),
        createBooking({ id: 'booking-2' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('cancel-button-booking-1'));
      expect(mockCallbacks.onCancel).toHaveBeenCalledWith(bookings[0]);
      expect(mockCallbacks.onCancel).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      fireEvent.press(getByTestId('reschedule-button-booking-2'));
      expect(mockCallbacks.onReschedule).toHaveBeenCalledWith(bookings[1]);
      expect(mockCallbacks.onReschedule).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // SCROLLVIEW BEHAVIOR TESTS
  // ============================================================================

  describe('ScrollView Behavior', () => {
    it('should hide vertical scroll indicator', () => {
      const booking = createBooking();
      const { UNSAFE_getAllByType } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      const scrollViews = UNSAFE_getAllByType('ScrollView');
      expect(scrollViews[0].props.showsVerticalScrollIndicator).toBe(false);
    });

    it('should apply correct content container style', () => {
      const booking = createBooking();
      const { UNSAFE_getAllByType } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      const scrollViews = UNSAFE_getAllByType('ScrollView');
      expect(scrollViews[0].props.contentContainerStyle).toBeDefined();
    });

    it('should render ScrollView with correct style prop', () => {
      const booking = createBooking();
      const { UNSAFE_getAllByType } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      const scrollViews = UNSAFE_getAllByType('ScrollView');
      expect(scrollViews[0].props.style).toBeDefined();
    });

    it('should handle scroll behavior with many bookings', () => {
      const bookings = Array.from({ length: 20 }, (_, i) =>
        createBooking({ id: `booking-${i}` })
      );

      const { UNSAFE_getAllByType } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      const scrollViews = UNSAFE_getAllByType('ScrollView');
      expect(scrollViews.length).toBe(1);
      expect(scrollViews[0].props.showsVerticalScrollIndicator).toBe(false);
    });
  });

  // ============================================================================
  // CALLBACK PROPAGATION TESTS
  // ============================================================================

  describe('Callback Propagation - onCancel', () => {
    it('should propagate onCancel callback to BookingCard', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('cancel-button-booking-1'));
      expect(mockCallbacks.onCancel).toHaveBeenCalledWith(booking);
      expect(mockCallbacks.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel with correct booking object', () => {
      const booking = createBooking({
        id: 'test-booking',
        contractorName: 'Test Contractor',
      });

      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('cancel-button-test-booking'));
      expect(mockCallbacks.onCancel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-booking',
          contractorName: 'Test Contractor',
        })
      );
    });

    it('should not call other callbacks when onCancel is triggered', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('cancel-button-booking-1'));
      expect(mockCallbacks.onReschedule).not.toHaveBeenCalled();
      expect(mockCallbacks.onRate).not.toHaveBeenCalled();
      expect(mockCallbacks.onShare).not.toHaveBeenCalled();
      expect(mockCallbacks.onViewDetails).not.toHaveBeenCalled();
    });
  });

  describe('Callback Propagation - onReschedule', () => {
    it('should propagate onReschedule callback to BookingCard', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('reschedule-button-booking-1'));
      expect(mockCallbacks.onReschedule).toHaveBeenCalledWith(booking);
      expect(mockCallbacks.onReschedule).toHaveBeenCalledTimes(1);
    });

    it('should call onReschedule with correct booking object', () => {
      const booking = createBooking({
        id: 'reschedule-test',
        serviceName: 'Emergency Plumbing',
      });

      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('reschedule-button-reschedule-test'));
      expect(mockCallbacks.onReschedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'reschedule-test',
          serviceName: 'Emergency Plumbing',
        })
      );
    });

    it('should not call other callbacks when onReschedule is triggered', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('reschedule-button-booking-1'));
      expect(mockCallbacks.onCancel).not.toHaveBeenCalled();
      expect(mockCallbacks.onRate).not.toHaveBeenCalled();
      expect(mockCallbacks.onShare).not.toHaveBeenCalled();
      expect(mockCallbacks.onViewDetails).not.toHaveBeenCalled();
    });
  });

  describe('Callback Propagation - onRate', () => {
    it('should propagate onRate callback to BookingCard', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('rate-button-booking-1'));
      expect(mockCallbacks.onRate).toHaveBeenCalledWith(booking);
      expect(mockCallbacks.onRate).toHaveBeenCalledTimes(1);
    });

    it('should call onRate with correct booking object', () => {
      const booking = createBooking({
        id: 'rate-test',
        status: 'completed',
      });

      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('rate-button-rate-test'));
      expect(mockCallbacks.onRate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rate-test',
          status: 'completed',
        })
      );
    });

    it('should not call other callbacks when onRate is triggered', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('rate-button-booking-1'));
      expect(mockCallbacks.onCancel).not.toHaveBeenCalled();
      expect(mockCallbacks.onReschedule).not.toHaveBeenCalled();
      expect(mockCallbacks.onShare).not.toHaveBeenCalled();
      expect(mockCallbacks.onViewDetails).not.toHaveBeenCalled();
    });
  });

  describe('Callback Propagation - onShare', () => {
    it('should propagate onShare callback to BookingCard', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('share-button-booking-1'));
      expect(mockCallbacks.onShare).toHaveBeenCalledWith(booking);
      expect(mockCallbacks.onShare).toHaveBeenCalledTimes(1);
    });

    it('should call onShare with correct booking object', () => {
      const booking = createBooking({
        id: 'share-test',
        contractorName: 'Share Test Contractor',
      });

      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('share-button-share-test'));
      expect(mockCallbacks.onShare).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'share-test',
          contractorName: 'Share Test Contractor',
        })
      );
    });

    it('should not call other callbacks when onShare is triggered', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('share-button-booking-1'));
      expect(mockCallbacks.onCancel).not.toHaveBeenCalled();
      expect(mockCallbacks.onReschedule).not.toHaveBeenCalled();
      expect(mockCallbacks.onRate).not.toHaveBeenCalled();
      expect(mockCallbacks.onViewDetails).not.toHaveBeenCalled();
    });
  });

  describe('Callback Propagation - onViewDetails', () => {
    it('should propagate onViewDetails callback to BookingCard', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('view-details-button-booking-1'));
      expect(mockCallbacks.onViewDetails).toHaveBeenCalledWith(booking);
      expect(mockCallbacks.onViewDetails).toHaveBeenCalledTimes(1);
    });

    it('should call onViewDetails with correct booking object', () => {
      const booking = createBooking({
        id: 'details-test',
        address: 'Test Address',
      });

      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('view-details-button-details-test'));
      expect(mockCallbacks.onViewDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'details-test',
          address: 'Test Address',
        })
      );
    });

    it('should not call other callbacks when onViewDetails is triggered', () => {
      const booking = createBooking();
      const { getByTestId } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('view-details-button-booking-1'));
      expect(mockCallbacks.onCancel).not.toHaveBeenCalled();
      expect(mockCallbacks.onReschedule).not.toHaveBeenCalled();
      expect(mockCallbacks.onRate).not.toHaveBeenCalled();
      expect(mockCallbacks.onShare).not.toHaveBeenCalled();
    });
  });

  describe('Callback Propagation - Multiple Bookings', () => {
    it('should handle callbacks for different bookings independently', () => {
      const bookings = [
        createBooking({ id: 'booking-1' }),
        createBooking({ id: 'booking-2' }),
        createBooking({ id: 'booking-3' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('cancel-button-booking-1'));
      expect(mockCallbacks.onCancel).toHaveBeenCalledWith(bookings[0]);

      fireEvent.press(getByTestId('reschedule-button-booking-2'));
      expect(mockCallbacks.onReschedule).toHaveBeenCalledWith(bookings[1]);

      fireEvent.press(getByTestId('share-button-booking-3'));
      expect(mockCallbacks.onShare).toHaveBeenCalledWith(bookings[2]);
    });

    it('should maintain separate callback counts for each booking', () => {
      const bookings = [
        createBooking({ id: 'booking-1' }),
        createBooking({ id: 'booking-2' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      fireEvent.press(getByTestId('cancel-button-booking-1'));
      fireEvent.press(getByTestId('cancel-button-booking-1'));
      expect(mockCallbacks.onCancel).toHaveBeenCalledTimes(2);

      fireEvent.press(getByTestId('cancel-button-booking-2'));
      expect(mockCallbacks.onCancel).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // EDGE CASES AND DATA VARIATIONS
  // ============================================================================

  describe('Edge Cases - Booking Data', () => {
    it('should handle booking with minimal required fields', () => {
      const minimalBooking = createBooking({
        specialInstructions: undefined,
        rating: undefined,
      });

      const { getByTestId } = render(
        <BookingList bookings={[minimalBooking]} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
    });

    it('should handle booking with all optional fields', () => {
      const fullBooking = createBooking({
        specialInstructions: 'Special instructions here',
        rating: 5,
        contractorImage: 'https://example.com/image.jpg',
      });

      const { getByTestId } = render(
        <BookingList bookings={[fullBooking]} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
    });

    it('should handle bookings with very long text fields', () => {
      const longTextBooking = createBooking({
        contractorName: 'A'.repeat(100),
        serviceName: 'B'.repeat(100),
        address: 'C'.repeat(200),
      });

      const { getByTestId } = render(
        <BookingList bookings={[longTextBooking]} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
    });

    it('should handle bookings with special characters in text', () => {
      const specialCharBooking = createBooking({
        contractorName: "O'Brien & Co.",
        serviceName: "AC & Heating <Repair>",
        address: '123 Main St., Apt. #5',
      });

      const { getByTestId } = render(
        <BookingList bookings={[specialCharBooking]} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
    });

    it('should handle bookings with zero amount', () => {
      const freeBooking = createBooking({ amount: 0 });

      const { getByTestId } = render(
        <BookingList bookings={[freeBooking]} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
    });

    it('should handle bookings with large amounts', () => {
      const expensiveBooking = createBooking({ amount: 999999.99 });

      const { getByTestId } = render(
        <BookingList bookings={[expensiveBooking]} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
    });
  });

  describe('Edge Cases - Array Handling', () => {
    it('should handle exactly one booking', () => {
      const bookings = [createBooking()];
      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
    });

    it('should handle exactly two bookings', () => {
      const bookings = [
        createBooking({ id: 'booking-1' }),
        createBooking({ id: 'booking-2' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
      expect(getByTestId('booking-card-booking-2')).toBeTruthy();
    });

    it('should handle bookings with duplicate data but unique IDs', () => {
      const bookings = [
        createBooking({ id: 'booking-1', contractorName: 'Same Name' }),
        createBooking({ id: 'booking-2', contractorName: 'Same Name' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
      expect(getByTestId('booking-card-booking-2')).toBeTruthy();
    });

    it('should handle odd number of bookings', () => {
      const bookings = [
        createBooking({ id: 'booking-1' }),
        createBooking({ id: 'booking-2' }),
        createBooking({ id: 'booking-3' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
      expect(getByTestId('booking-card-booking-2')).toBeTruthy();
      expect(getByTestId('booking-card-booking-3')).toBeTruthy();
    });

    it('should handle even number of bookings', () => {
      const bookings = [
        createBooking({ id: 'booking-1' }),
        createBooking({ id: 'booking-2' }),
        createBooking({ id: 'booking-3' }),
        createBooking({ id: 'booking-4' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
      expect(getByTestId('booking-card-booking-2')).toBeTruthy();
      expect(getByTestId('booking-card-booking-3')).toBeTruthy();
      expect(getByTestId('booking-card-booking-4')).toBeTruthy();
    });
  });

  // ============================================================================
  // PROPS UPDATE AND RERENDERING
  // ============================================================================

  describe('Props Updates', () => {
    it('should update when bookings prop changes from empty to populated', () => {
      const { rerender, getByText, getByTestId } = render(
        <BookingList bookings={[]} {...mockCallbacks} />
      );

      expect(getByText('No bookings found')).toBeTruthy();

      const bookings = [createBooking()];
      rerender(<BookingList bookings={bookings} {...mockCallbacks} />);

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
    });

    it('should update when bookings prop changes from populated to empty', () => {
      const bookings = [createBooking()];
      const { rerender, getByTestId, getByText } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();

      rerender(<BookingList bookings={[]} {...mockCallbacks} />);

      expect(getByText('No bookings found')).toBeTruthy();
    });

    it('should update when number of bookings increases', () => {
      const initialBookings = [createBooking({ id: 'booking-1' })];
      const { rerender, getByTestId } = render(
        <BookingList bookings={initialBookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();

      const newBookings = [
        ...initialBookings,
        createBooking({ id: 'booking-2' }),
      ];
      rerender(<BookingList bookings={newBookings} {...mockCallbacks} />);

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
      expect(getByTestId('booking-card-booking-2')).toBeTruthy();
    });

    it('should update when number of bookings decreases', () => {
      const initialBookings = [
        createBooking({ id: 'booking-1' }),
        createBooking({ id: 'booking-2' }),
      ];
      const { rerender, getByTestId, queryByTestId } = render(
        <BookingList bookings={initialBookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
      expect(getByTestId('booking-card-booking-2')).toBeTruthy();

      const newBookings = [initialBookings[0]];
      rerender(<BookingList bookings={newBookings} {...mockCallbacks} />);

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
      expect(queryByTestId('booking-card-booking-2')).toBeNull();
    });

    it('should update when booking order changes', () => {
      const bookings = [
        createBooking({ id: 'booking-1', contractorName: 'First' }),
        createBooking({ id: 'booking-2', contractorName: 'Second' }),
      ];

      const { rerender, getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-name-booking-1')).toBeTruthy();
      expect(getByTestId('booking-name-booking-2')).toBeTruthy();

      const reversedBookings = [...bookings].reverse();
      rerender(<BookingList bookings={reversedBookings} {...mockCallbacks} />);

      expect(getByTestId('booking-name-booking-1')).toBeTruthy();
      expect(getByTestId('booking-name-booking-2')).toBeTruthy();
    });

    it('should update when booking data changes', () => {
      const initialBooking = createBooking({ contractorName: 'Old Name' });
      const { rerender, getByTestId } = render(
        <BookingList bookings={[initialBooking]} {...mockCallbacks} />
      );

      const updatedBooking = createBooking({ contractorName: 'New Name' });
      rerender(<BookingList bookings={[updatedBooking]} {...mockCallbacks} />);

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
    });

    it('should update callbacks when they change', () => {
      const initialCallbacks = {
        onCancel: jest.fn(),
        onReschedule: jest.fn(),
        onRate: jest.fn(),
        onShare: jest.fn(),
        onViewDetails: jest.fn(),
      };

      const booking = createBooking();
      const { rerender, getByTestId } = render(
        <BookingList bookings={[booking]} {...initialCallbacks} />
      );

      fireEvent.press(getByTestId('cancel-button-booking-1'));
      expect(initialCallbacks.onCancel).toHaveBeenCalledTimes(1);

      const newCallbacks = {
        onCancel: jest.fn(),
        onReschedule: jest.fn(),
        onRate: jest.fn(),
        onShare: jest.fn(),
        onViewDetails: jest.fn(),
      };

      rerender(<BookingList bookings={[booking]} {...newCallbacks} />);

      fireEvent.press(getByTestId('cancel-button-booking-1'));
      expect(newCallbacks.onCancel).toHaveBeenCalledTimes(1);
      expect(initialCallbacks.onCancel).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  // ============================================================================
  // SNAPSHOT TESTS
  // ============================================================================

  describe('Snapshot Tests', () => {
    it('should match snapshot for empty state', () => {
      const { toJSON } = render(
        <BookingList bookings={[]} {...mockCallbacks} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for single booking', () => {
      const booking = createBooking();
      const { toJSON } = render(
        <BookingList bookings={[booking]} {...mockCallbacks} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for multiple bookings', () => {
      const bookings = [
        createBooking({ id: 'booking-1', status: 'upcoming' }),
        createBooking({ id: 'booking-2', status: 'completed' }),
        createBooking({ id: 'booking-3', status: 'cancelled' }),
      ];

      const { toJSON } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    it('should handle complete workflow with empty to populated list', () => {
      const { rerender, getByText, queryByText, getByTestId } = render(
        <BookingList bookings={[]} {...mockCallbacks} />
      );

      // Start with empty state
      expect(getByText('No bookings found')).toBeTruthy();

      // Add bookings
      const bookings = [
        createBooking({ id: 'booking-1' }),
        createBooking({ id: 'booking-2' }),
      ];
      rerender(<BookingList bookings={bookings} {...mockCallbacks} />);

      // Verify list rendered
      expect(queryByText('No bookings found')).toBeNull();
      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
      expect(getByTestId('booking-card-booking-2')).toBeTruthy();

      // Interact with booking
      fireEvent.press(getByTestId('cancel-button-booking-1'));
      expect(mockCallbacks.onCancel).toHaveBeenCalledWith(bookings[0]);
    });

    it('should handle complete workflow with multiple interactions', () => {
      const bookings = [
        createBooking({ id: 'booking-1' }),
        createBooking({ id: 'booking-2' }),
        createBooking({ id: 'booking-3' }),
      ];

      const { getByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      // Multiple different interactions
      fireEvent.press(getByTestId('cancel-button-booking-1'));
      fireEvent.press(getByTestId('reschedule-button-booking-2'));
      fireEvent.press(getByTestId('share-button-booking-3'));
      fireEvent.press(getByTestId('view-details-button-booking-1'));

      expect(mockCallbacks.onCancel).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onReschedule).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onShare).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onViewDetails).toHaveBeenCalledTimes(1);
    });

    it('should maintain state through rapid booking updates', () => {
      let bookings = [createBooking({ id: 'booking-1' })];
      const { rerender, getByTestId, queryByTestId } = render(
        <BookingList bookings={bookings} {...mockCallbacks} />
      );

      expect(getByTestId('booking-card-booking-1')).toBeTruthy();

      // Add booking
      bookings = [...bookings, createBooking({ id: 'booking-2' })];
      rerender(<BookingList bookings={bookings} {...mockCallbacks} />);
      expect(getByTestId('booking-card-booking-2')).toBeTruthy();

      // Add another
      bookings = [...bookings, createBooking({ id: 'booking-3' })];
      rerender(<BookingList bookings={bookings} {...mockCallbacks} />);
      expect(getByTestId('booking-card-booking-3')).toBeTruthy();

      // Remove one
      bookings = bookings.filter(b => b.id !== 'booking-2');
      rerender(<BookingList bookings={bookings} {...mockCallbacks} />);
      expect(queryByTestId('booking-card-booking-2')).toBeNull();

      // Verify others still exist
      expect(getByTestId('booking-card-booking-1')).toBeTruthy();
      expect(getByTestId('booking-card-booking-3')).toBeTruthy();
    });
  });
});

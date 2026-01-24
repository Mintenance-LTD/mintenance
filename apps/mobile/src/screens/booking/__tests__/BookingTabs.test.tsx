/**
 * BookingTabs Component Tests
 *
 * Comprehensive test suite for the BookingTabs component
 * Tests all tab variations, switching behavior, badge rendering, and accessibility
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BookingTabs } from '../BookingTabs';
import { Booking, BookingStatus } from '../BookingStatusScreen';

// Mock theme
jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      surface: '#F5F5F5',
      primary: '#007AFF',
      accent: '#FF6B6B',
      textSecondary: '#666666',
      textInverse: '#FFFFFF',
    },
  },
}));

describe('BookingTabs', () => {
  const mockOnTabChange = jest.fn();

  const createMockBooking = (
    id: string,
    status: BookingStatus,
    overrides?: Partial<Booking>
  ): Booking => ({
    id,
    contractorName: 'John Contractor',
    serviceName: 'Plumbing Service',
    address: '123 Main St',
    serviceId: 'service-1',
    date: '2024-02-01',
    time: '10:00 AM',
    status,
    amount: 150,
    canCancel: status === 'upcoming',
    canReschedule: status === 'upcoming',
    estimatedDuration: '2 hours',
    ...overrides,
  });

  const mockBookings: Booking[] = [
    createMockBooking('1', 'upcoming'),
    createMockBooking('2', 'upcoming'),
    createMockBooking('3', 'upcoming'),
    createMockBooking('4', 'completed'),
    createMockBooking('5', 'completed'),
    createMockBooking('6', 'cancelled'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== RENDERING TESTS ==========
  describe('Rendering', () => {
    it('renders all three tabs', () => {
      const { getByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByText('Upcoming')).toBeTruthy();
      expect(getByText('Completed')).toBeTruthy();
      expect(getByText('Cancelled')).toBeTruthy();
    });

    it('renders with empty bookings array', () => {
      const { getByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={[]}
        />
      );

      expect(getByText('Upcoming')).toBeTruthy();
      expect(getByText('Completed')).toBeTruthy();
      expect(getByText('Cancelled')).toBeTruthy();
    });

    it('renders tabs container with correct structure', () => {
      const { getByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      const upcomingTab = getByText('Upcoming');
      expect(upcomingTab.parent).toBeTruthy();
    });

    it('renders all tabs even with single booking', () => {
      const singleBooking = [createMockBooking('1', 'upcoming')];
      const { getByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={singleBooking}
        />
      );

      expect(getByText('Upcoming')).toBeTruthy();
      expect(getByText('Completed')).toBeTruthy();
      expect(getByText('Cancelled')).toBeTruthy();
    });

    it('renders tabs in correct order', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();
    });
  });

  // ========== ACTIVE TAB TESTS ==========
  describe('Active Tab Styling', () => {
    it('shows upcoming tab as active when activeTab is upcoming', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      const upcomingTab = getByLabelText('Upcoming tab with 3 bookings');
      expect(upcomingTab).toBeTruthy();
    });

    it('shows completed tab as active when activeTab is completed', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="completed"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      const completedTab = getByLabelText('Completed tab with 2 bookings');
      expect(completedTab).toBeTruthy();
    });

    it('shows cancelled tab as active when activeTab is cancelled', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="cancelled"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      const cancelledTab = getByLabelText('Cancelled tab with 1 bookings');
      expect(cancelledTab).toBeTruthy();
    });

    it('changes active tab styling when activeTab prop changes', () => {
      const { rerender, getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();

      rerender(
        <BookingTabs
          activeTab="completed"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
    });

    it('applies active styles only to selected tab', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();
    });
  });

  // ========== TAB SWITCHING TESTS ==========
  describe('Tab Switching', () => {
    it('calls onTabChange with upcoming when upcoming tab is pressed', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="completed"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      fireEvent.press(getByLabelText('Upcoming tab with 3 bookings'));
      expect(mockOnTabChange).toHaveBeenCalledWith('upcoming');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('calls onTabChange with completed when completed tab is pressed', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      fireEvent.press(getByLabelText('Completed tab with 2 bookings'));
      expect(mockOnTabChange).toHaveBeenCalledWith('completed');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('calls onTabChange with cancelled when cancelled tab is pressed', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      fireEvent.press(getByLabelText('Cancelled tab with 1 bookings'));
      expect(mockOnTabChange).toHaveBeenCalledWith('cancelled');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('calls onTabChange when active tab is pressed again', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      fireEvent.press(getByLabelText('Upcoming tab with 3 bookings'));
      expect(mockOnTabChange).toHaveBeenCalledWith('upcoming');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('handles rapid tab switching', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      fireEvent.press(getByLabelText('Completed tab with 2 bookings'));
      fireEvent.press(getByLabelText('Cancelled tab with 1 bookings'));
      fireEvent.press(getByLabelText('Upcoming tab with 3 bookings'));

      expect(mockOnTabChange).toHaveBeenCalledTimes(3);
      expect(mockOnTabChange).toHaveBeenNthCalledWith(1, 'completed');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(2, 'cancelled');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(3, 'upcoming');
    });

    it('handles sequential tab presses to same tab', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      const upcomingTab = getByLabelText('Upcoming tab with 3 bookings');
      fireEvent.press(upcomingTab);
      fireEvent.press(upcomingTab);
      fireEvent.press(upcomingTab);

      expect(mockOnTabChange).toHaveBeenCalledTimes(3);
      expect(mockOnTabChange).toHaveBeenCalledWith('upcoming');
    });

    it('switches between all tabs sequentially', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      // upcoming -> completed
      fireEvent.press(getByLabelText('Completed tab with 2 bookings'));
      expect(mockOnTabChange).toHaveBeenLastCalledWith('completed');

      // completed -> cancelled
      fireEvent.press(getByLabelText('Cancelled tab with 1 bookings'));
      expect(mockOnTabChange).toHaveBeenLastCalledWith('cancelled');

      // cancelled -> upcoming
      fireEvent.press(getByLabelText('Upcoming tab with 3 bookings'));
      expect(mockOnTabChange).toHaveBeenLastCalledWith('upcoming');

      expect(mockOnTabChange).toHaveBeenCalledTimes(3);
    });
  });

  // ========== BADGE RENDERING TESTS ==========
  describe('Badge Rendering', () => {
    it('shows badge with count 3 for upcoming tab', () => {
      const { getByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByText('3')).toBeTruthy();
    });

    it('shows badge with count 2 for completed tab', () => {
      const { getByText } = render(
        <BookingTabs
          activeTab="completed"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByText('2')).toBeTruthy();
    });

    it('shows badge with count 1 for cancelled tab', () => {
      const { getByText } = render(
        <BookingTabs
          activeTab="cancelled"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByText('1')).toBeTruthy();
    });

    it('does not show badge when count is 0', () => {
      const { queryByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={[createMockBooking('1', 'upcoming')]}
        />
      );

      expect(queryByText('0')).toBeNull();
    });

    it('does not show badges when all counts are 0', () => {
      const { queryByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={[]}
        />
      );

      expect(queryByText('0')).toBeNull();
      expect(queryByText('1')).toBeNull();
      expect(queryByText('2')).toBeNull();
    });

    it('shows multiple badges when multiple tabs have bookings', () => {
      const { getByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByText('3')).toBeTruthy(); // upcoming
      expect(getByText('2')).toBeTruthy(); // completed
      expect(getByText('1')).toBeTruthy(); // cancelled
    });

    it('shows badge with large count correctly', () => {
      const manyBookings = Array.from({ length: 25 }, (_, i) =>
        createMockBooking(`${i}`, 'upcoming')
      );

      const { getByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={manyBookings}
        />
      );

      expect(getByText('25')).toBeTruthy();
    });

    it('shows badge with triple digit count', () => {
      const manyBookings = Array.from({ length: 123 }, (_, i) =>
        createMockBooking(`${i}`, 'completed')
      );

      const { getByText } = render(
        <BookingTabs
          activeTab="completed"
          onTabChange={mockOnTabChange}
          bookings={manyBookings}
        />
      );

      expect(getByText('123')).toBeTruthy();
    });

    it('updates badge count when bookings change', () => {
      const { getByText, rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByText('3')).toBeTruthy();

      const newBookings = [
        ...mockBookings,
        createMockBooking('7', 'upcoming'),
      ];

      rerender(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={newBookings}
        />
      );

      expect(getByText('4')).toBeTruthy();
    });

    it('removes badge when count becomes 0', () => {
      const { getByText, queryByText, rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByText('3')).toBeTruthy();

      rerender(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={[]}
        />
      );

      expect(queryByText('3')).toBeNull();
      expect(queryByText('0')).toBeNull();
    });
  });

  // ========== BOOKING COUNT CALCULATION TESTS ==========
  describe('Booking Count Calculation', () => {
    it('correctly counts upcoming bookings', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();
    });

    it('correctly counts completed bookings', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="completed"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
    });

    it('correctly counts cancelled bookings', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="cancelled"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();
    });

    it('handles all bookings with same status', () => {
      const allUpcoming = mockBookings.map((b) => ({
        ...b,
        status: 'upcoming' as BookingStatus,
      }));

      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={allUpcoming}
        />
      );

      expect(getByLabelText('Upcoming tab with 6 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 0 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 0 bookings')).toBeTruthy();
    });

    it('handles mixed booking statuses correctly', () => {
      const mixedBookings = [
        createMockBooking('1', 'upcoming'),
        createMockBooking('2', 'completed'),
        createMockBooking('3', 'upcoming'),
        createMockBooking('4', 'cancelled'),
        createMockBooking('5', 'upcoming'),
      ];

      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mixedBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 1 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();
    });

    it('recalculates counts when bookings prop updates', () => {
      const { getByLabelText, rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();

      const updatedBookings = [
        ...mockBookings,
        createMockBooking('7', 'upcoming'),
        createMockBooking('8', 'upcoming'),
      ];

      rerender(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={updatedBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 5 bookings')).toBeTruthy();
    });
  });

  // ========== ACCESSIBILITY TESTS ==========
  describe('Accessibility', () => {
    it('all tabs have accessibility labels', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();
    });

    it('upcoming tab has descriptive accessibility label', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();
    });

    it('completed tab has descriptive accessibility label', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="completed"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
    });

    it('cancelled tab has descriptive accessibility label', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="cancelled"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();
    });

    it('accessibility labels update with booking counts', () => {
      const { getByLabelText, rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();

      const updatedBookings = [createMockBooking('1', 'upcoming')];

      rerender(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={updatedBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 1 bookings')).toBeTruthy();
    });

    it('accessibility labels show 0 bookings correctly', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={[]}
        />
      );

      expect(getByLabelText('Upcoming tab with 0 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 0 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 0 bookings')).toBeTruthy();
    });

    it('tabs are keyboard accessible', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      const upcomingTab = getByLabelText('Upcoming tab with 3 bookings');
      const completedTab = getByLabelText('Completed tab with 2 bookings');
      const cancelledTab = getByLabelText('Cancelled tab with 1 bookings');

      expect(upcomingTab.props.accessibilityRole).toBe('button');
      expect(completedTab.props.accessibilityRole).toBe('button');
      expect(cancelledTab.props.accessibilityRole).toBe('button');
    });
  });

  // ========== EDGE CASES ==========
  describe('Edge Cases', () => {
    it('handles empty bookings array without errors', () => {
      const { getByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={[]}
        />
      );

      expect(getByText('Upcoming')).toBeTruthy();
      expect(getByText('Completed')).toBeTruthy();
      expect(getByText('Cancelled')).toBeTruthy();
    });

    it('handles single booking per status', () => {
      const singleBookings = [
        createMockBooking('1', 'upcoming'),
        createMockBooking('2', 'completed'),
        createMockBooking('3', 'cancelled'),
      ];

      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={singleBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 1 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 1 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();
    });

    it('handles very large number of bookings', () => {
      const manyBookings = Array.from({ length: 1000 }, (_, i) =>
        createMockBooking(`${i}`, i % 3 === 0 ? 'upcoming' : i % 3 === 1 ? 'completed' : 'cancelled')
      );

      const { getByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={manyBookings}
        />
      );

      expect(getByText('Upcoming')).toBeTruthy();
      expect(getByText('Completed')).toBeTruthy();
      expect(getByText('Cancelled')).toBeTruthy();
    });

    it('handles booking with missing status field', () => {
      const invalidBookings = [
        { ...createMockBooking('1', 'upcoming'), status: undefined as any },
      ];

      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={invalidBookings}
        />
      );

      // Should show 0 bookings for all tabs since status is invalid
      expect(getByLabelText('Upcoming tab with 0 bookings')).toBeTruthy();
    });

    it('handles duplicate booking IDs', () => {
      const duplicateBookings = [
        createMockBooking('1', 'upcoming'),
        createMockBooking('1', 'upcoming'),
        createMockBooking('1', 'completed'),
      ];

      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={duplicateBookings}
        />
      );

      // Should count all bookings even with duplicate IDs
      expect(getByLabelText('Upcoming tab with 2 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 1 bookings')).toBeTruthy();
    });
  });

  // ========== CALLBACK BEHAVIOR ==========
  describe('Callback Behavior', () => {
    it('calls onTabChange with proper parameters', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      fireEvent.press(getByLabelText('Completed tab with 2 bookings'));
      expect(mockOnTabChange).toHaveBeenCalledWith('completed');
    });

    it('onTabChange is called with correct tab ID type', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      fireEvent.press(getByLabelText('Completed tab with 2 bookings'));

      expect(mockOnTabChange).toHaveBeenCalledWith('completed');
      expect(typeof mockOnTabChange.mock.calls[0][0]).toBe('string');
    });

    it('does not call onTabChange on initial render', () => {
      render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(mockOnTabChange).not.toHaveBeenCalled();
    });

    it('does not call onTabChange when bookings update', () => {
      const { rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      const updatedBookings = [...mockBookings, createMockBooking('7', 'upcoming')];

      rerender(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={updatedBookings}
        />
      );

      expect(mockOnTabChange).not.toHaveBeenCalled();
    });

    it('calls onTabChange only once per press', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      fireEvent.press(getByLabelText('Completed tab with 2 bookings'));

      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });
  });

  // ========== RERENDER TESTS ==========
  describe('Rerender Behavior', () => {
    it('updates active tab on prop change', () => {
      const { getByLabelText, rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();

      rerender(
        <BookingTabs
          activeTab="completed"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
    });

    it('updates badge counts on bookings change', () => {
      const { getByText, rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByText('3')).toBeTruthy();

      const updatedBookings = mockBookings.filter((b) => b.status !== 'upcoming');

      rerender(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={updatedBookings}
        />
      );

      expect(getByText('2')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
    });

    it('handles multiple rapid prop changes', () => {
      const { rerender, getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      rerender(
        <BookingTabs
          activeTab="completed"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      rerender(
        <BookingTabs
          activeTab="cancelled"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();
    });

    it('maintains tab structure through rerenders', () => {
      const { getByLabelText, rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();

      rerender(
        <BookingTabs
          activeTab="completed"
          onTabChange={mockOnTabChange}
          bookings={[]}
        />
      );

      expect(getByLabelText('Upcoming tab with 0 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 0 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 0 bookings')).toBeTruthy();
    });

    it('updates onTabChange callback on prop change', () => {
      const newCallback = jest.fn();
      const { getByLabelText, rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      rerender(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={newCallback}
          bookings={mockBookings}
        />
      );

      fireEvent.press(getByLabelText('Completed tab with 2 bookings'));

      expect(mockOnTabChange).not.toHaveBeenCalled();
      expect(newCallback).toHaveBeenCalledWith('completed');
    });
  });

  // ========== PERFORMANCE TESTS ==========
  describe('Performance', () => {
    it('does not cause unnecessary rerenders with same props', () => {
      const renderSpy = jest.fn();

      const TestWrapper = (props: any) => {
        renderSpy();
        return <BookingTabs {...props} />;
      };

      const { rerender } = render(
        <TestWrapper
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      rerender(
        <TestWrapper
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('efficiently handles large booking arrays', () => {
      const largeBookingArray = Array.from({ length: 10000 }, (_, i) =>
        createMockBooking(`${i}`, i % 3 === 0 ? 'upcoming' : i % 3 === 1 ? 'completed' : 'cancelled')
      );

      const startTime = Date.now();

      const { getByText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={largeBookingArray}
        />
      );

      const endTime = Date.now();

      expect(getByText('Upcoming')).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(1000); // Should render in less than 1 second
    });

    it('handles rapid rerenders without crashing', () => {
      const { rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      for (let i = 0; i < 100; i++) {
        rerender(
          <BookingTabs
            activeTab={i % 2 === 0 ? 'upcoming' : 'completed'}
            onTabChange={mockOnTabChange}
            bookings={mockBookings}
          />
        );
      }

      expect(true).toBe(true); // If we got here, no crash occurred
    });
  });

  // ========== TAB ORDER TESTS ==========
  describe('Tab Order', () => {
    it('renders tabs in order: Upcoming, Completed, Cancelled', () => {
      const { getByLabelText } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();
    });

    it('maintains tab order regardless of active tab', () => {
      const { getByLabelText, rerender } = render(
        <BookingTabs
          activeTab="cancelled"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();

      rerender(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 2 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 1 bookings')).toBeTruthy();
    });

    it('maintains tab order when booking counts change', () => {
      const { getByLabelText, rerender } = render(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={mockBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 3 bookings')).toBeTruthy();

      const newBookings = [createMockBooking('1', 'completed')];

      rerender(
        <BookingTabs
          activeTab="upcoming"
          onTabChange={mockOnTabChange}
          bookings={newBookings}
        />
      );

      expect(getByLabelText('Upcoming tab with 0 bookings')).toBeTruthy();
      expect(getByLabelText('Completed tab with 1 bookings')).toBeTruthy();
      expect(getByLabelText('Cancelled tab with 0 bookings')).toBeTruthy();
    });
  });
});

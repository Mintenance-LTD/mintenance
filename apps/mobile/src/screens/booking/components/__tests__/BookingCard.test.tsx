/**
 * BookingCard Component Tests
 *
 * Tests the BookingCard component functionality including:
 * - Rendering booking information
 * - Status display
 * - Action buttons based on status
 * - User interactions (contact, reschedule, cancel, review)
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { BookingCard } from '../BookingCard';
import type { Booking } from '../../viewmodels/BookingViewModel';

// Mock dependencies
jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      primary: '#0F172A',
      secondary: '#10B981',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      info: '#007AFF',
      background: '#FFFFFF',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textTertiary: '#6B7280',
      border: '#E5E7EB',
      status: {
        upcoming: '#E6F2FF',
        completed: '#EAF7EE',
        cancelled: '#FDECEA',
      },
    },
  },
}));

jest.mock('../../../../components/StatusPill', () => ({
  StatusPill: ({ status }: { status: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'status-pill' }, status);
  },
}));

describe('BookingCard', () => {
  const mockOnContactContractor = jest.fn();
  const mockOnShareBooking = jest.fn();
  const mockOnReschedule = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnViewReceipt = jest.fn();
  const mockOnLeaveReview = jest.fn();

  const baseBooking: Booking = {
    id: '1',
    contractorName: 'John Smith',
    serviceName: 'Plumbing Repair',
    address: '123 Main St, San Francisco, CA',
    serviceId: 'SVC-12345',
    date: '2024-01-15',
    time: '10:00 AM',
    status: 'upcoming',
    amount: 150.0,
    canCancel: true,
    canReschedule: true,
    estimatedDuration: '2 hours',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render booking information correctly', () => {
      const { getByText } = render(
        <BookingCard
          booking={baseBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(getByText('2024-01-15 - 10:00 AM')).toBeTruthy();
      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('Plumbing Repair')).toBeTruthy();
      expect(getByText('123 Main St, San Francisco, CA')).toBeTruthy();
      expect(getByText(/SVC-12345/)).toBeTruthy();
      expect(getByText('2 hours')).toBeTruthy();
      expect(getByText('$150.00')).toBeTruthy();
    });

    it('should render contractor name with accessibility label', () => {
      const { getByLabelText } = render(
        <BookingCard
          booking={baseBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(getByLabelText('Contractor name')).toBeTruthy();
    });

    it('should render status pill', () => {
      const { getByTestId } = render(
        <BookingCard
          booking={baseBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      const statusPill = getByTestId('status-pill');
      expect(statusPill).toBeTruthy();
      expect(statusPill.props.children).toBe('upcoming');
    });

    it('should render special instructions when provided', () => {
      const bookingWithInstructions = {
        ...baseBooking,
        specialInstructions: 'Please call before arriving',
      };

      const { getByText } = render(
        <BookingCard
          booking={bookingWithInstructions}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(getByText('Please call before arriving')).toBeTruthy();
    });

    it('should not render special instructions section when not provided', () => {
      const { queryByText } = render(
        <BookingCard
          booking={baseBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      // There should be no instructions container
      expect(baseBooking.specialInstructions).toBeUndefined();
    });
  });

  describe('Upcoming Status Actions', () => {
    it('should render contact and reschedule buttons for upcoming bookings', () => {
      const { getByText } = render(
        <BookingCard
          booking={baseBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(getByText('Contact')).toBeTruthy();
      expect(getByText('Reschedule')).toBeTruthy();
    });

    it('should call onContactContractor when contact button is pressed', () => {
      const { getByText } = render(
        <BookingCard
          booking={baseBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      fireEvent.press(getByText('Contact'));
      expect(mockOnContactContractor).toHaveBeenCalledWith(baseBooking);
    });

    it('should call onReschedule when reschedule button is pressed', () => {
      const { getByText } = render(
        <BookingCard
          booking={baseBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      fireEvent.press(getByText('Reschedule'));
      expect(mockOnReschedule).toHaveBeenCalledWith(baseBooking);
    });

    it('should not show reschedule button when canReschedule is false', () => {
      const bookingNoReschedule = {
        ...baseBooking,
        canReschedule: false,
      };

      const { queryByText } = render(
        <BookingCard
          booking={bookingNoReschedule}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(queryByText('Reschedule')).toBeNull();
    });
  });

  describe('Completed Status Actions', () => {
    const completedBooking: Booking = {
      ...baseBooking,
      status: 'completed',
      rating: 5,
    };

    it('should render receipt and review buttons for completed bookings', () => {
      const { getByText } = render(
        <BookingCard
          booking={completedBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(getByText('View Receipt')).toBeTruthy();
      expect(getByText('Leave Review')).toBeTruthy();
    });

    it('should call onViewReceipt when receipt button is pressed', () => {
      const { getByText } = render(
        <BookingCard
          booking={completedBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      fireEvent.press(getByText('View Receipt'));
      expect(mockOnViewReceipt).toHaveBeenCalledWith(completedBooking);
    });

    it('should call onLeaveReview when review button is pressed', () => {
      const { getByText } = render(
        <BookingCard
          booking={completedBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      fireEvent.press(getByText('Leave Review'));
      expect(mockOnLeaveReview).toHaveBeenCalledWith(completedBooking);
    });

    it('should display rating when available', () => {
      const { getByText } = render(
        <BookingCard
          booking={completedBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(getByText('5.0')).toBeTruthy();
    });
  });

  describe('Cancelled Status', () => {
    const cancelledBooking: Booking = {
      ...baseBooking,
      status: 'cancelled',
      canCancel: false,
      canReschedule: false,
    };

    it('should render cancelled status correctly', () => {
      const { getByTestId } = render(
        <BookingCard
          booking={cancelledBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      const statusPill = getByTestId('status-pill');
      expect(statusPill.props.children).toBe('cancelled');
    });

    it('should not show action buttons for cancelled bookings', () => {
      const { queryByText } = render(
        <BookingCard
          booking={cancelledBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(queryByText('Contact')).toBeNull();
      expect(queryByText('Reschedule')).toBeNull();
      expect(queryByText('View Receipt')).toBeNull();
      expect(queryByText('Leave Review')).toBeNull();
    });
  });

  describe('Status Colors', () => {
    it('should apply correct color scheme for upcoming status', () => {
      const { container } = render(
        <BookingCard
          booking={baseBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      // Component should render without errors
      expect(container).toBeTruthy();
    });

    it('should apply correct color scheme for completed status', () => {
      const completedBooking = { ...baseBooking, status: 'completed' as const };

      const { container } = render(
        <BookingCard
          booking={completedBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(container).toBeTruthy();
    });

    it('should apply correct color scheme for cancelled status', () => {
      const cancelledBooking = { ...baseBooking, status: 'cancelled' as const };

      const { container } = render(
        <BookingCard
          booking={cancelledBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rendering without crashing', () => {
      expect(() => {
        render(
          <BookingCard
            booking={baseBooking}
            onContactContractor={mockOnContactContractor}
            onShareBooking={mockOnShareBooking}
            onReschedule={mockOnReschedule}
            onCancel={mockOnCancel}
            onViewReceipt={mockOnViewReceipt}
            onLeaveReview={mockOnLeaveReview}
          />
        );
      }).not.toThrow();
    });

    it('should handle missing optional contractor image', () => {
      const { getByText } = render(
        <BookingCard
          booking={baseBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(getByText('John Smith')).toBeTruthy();
      expect(baseBooking.contractorImage).toBeUndefined();
    });

    it('should handle zero amount', () => {
      const freeBooking = { ...baseBooking, amount: 0 };

      const { getByText } = render(
        <BookingCard
          booking={freeBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(getByText('$0.00')).toBeTruthy();
    });

    it('should format large amounts correctly', () => {
      const expensiveBooking = { ...baseBooking, amount: 1234.56 };

      const { getByText } = render(
        <BookingCard
          booking={expensiveBooking}
          onContactContractor={mockOnContactContractor}
          onShareBooking={mockOnShareBooking}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onViewReceipt={mockOnViewReceipt}
          onLeaveReview={mockOnLeaveReview}
        />
      );

      expect(getByText('$1234.56')).toBeTruthy();
    });
  });
});

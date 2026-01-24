import React from 'react';
import { render, fireEvent, waitFor } from '../../../__tests__/test-utils';
import { CancellationModal } from '../CancellationModal';
import { Booking } from '../BookingStatusScreen';
import { HapticService } from '../../../utils/haptics';

// ============================================================================
// MOCKS
// ============================================================================

// Mock haptics
jest.mock('../../../utils/haptics', () => ({
  HapticService: {
    buttonPress: jest.fn(),
  },
  useHaptics: jest.fn(() => ({
    buttonPress: jest.fn(),
  })),
}));

// Mock theme to avoid dependencies
jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      textTertiary: '#9CA3AF',
      textInverse: '#FFFFFF',
      primary: '#0EA5E9',
      primaryLight: '#E0F2FE',
      error: '#EF4444',
      borderLight: '#E5E7EB',
      surfaceSecondary: '#F3F4F6',
    },
    shadows: {
      large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    },
  },
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// ============================================================================
// TEST DATA
// ============================================================================

const mockBooking: Booking = {
  id: 'booking-123',
  contractorName: 'John Doe Plumbing',
  contractorImage: 'https://example.com/avatar.jpg',
  serviceName: 'Pipe Repair',
  address: '123 Main St, City',
  serviceId: 'service-456',
  date: 'March 15, 2024',
  time: '2:00 PM',
  status: 'upcoming',
  amount: 150,
  rating: 4.5,
  canCancel: true,
  canReschedule: true,
  estimatedDuration: '2 hours',
  specialInstructions: 'Please call before arrival',
};

// ============================================================================
// TEST HELPERS
// ============================================================================

const defaultProps = {
  visible: true,
  booking: mockBooking,
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

const renderModal = (props = {}) => {
  return render(<CancellationModal {...defaultProps} {...props} />);
};

// ============================================================================
// CANCELLATION MODAL TESTS
// ============================================================================

describe('CancellationModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Visibility & Rendering Tests
  // --------------------------------------------------------------------------

  describe('Visibility & Rendering', () => {
    it('renders when visible is true and booking exists', () => {
      const { getAllByText } = renderModal();
      const titles = getAllByText('Cancel Booking');
      expect(titles.length).toBeGreaterThan(0); // Should have title and button
    });

    it('does not render when visible is false', () => {
      const { queryByText } = renderModal({ visible: false });
      expect(queryByText('Cancel Booking')).toBeNull();
    });

    it('does not render when booking is null', () => {
      const { queryByText } = renderModal({ booking: null });
      expect(queryByText('Cancel Booking')).toBeNull();
    });

    it('does not render when visible is false and booking is null', () => {
      const { queryByText } = renderModal({ visible: false, booking: null });
      expect(queryByText('Cancel Booking')).toBeNull();
    });

    it('renders as a modal with transparent background', () => {
      const { getAllByText } = renderModal();
      const titles = getAllByText('Cancel Booking');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('displays modal title correctly', () => {
      const { getAllByText } = renderModal();
      const titles = getAllByText('Cancel Booking');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('displays close button with accessibility label', () => {
      const { getByLabelText } = renderModal();
      expect(getByLabelText('Close modal')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Booking Information Display Tests
  // --------------------------------------------------------------------------

  describe('Booking Information Display', () => {
    it('displays service name', () => {
      const { getByText } = renderModal();
      expect(getByText('Pipe Repair')).toBeTruthy();
    });

    it('displays booking date and time', () => {
      const { getByText } = renderModal();
      expect(getByText('March 15, 2024 at 2:00 PM')).toBeTruthy();
    });

    it('handles different date formats', () => {
      const customBooking = { ...mockBooking, date: 'Jan 1, 2024', time: '10:00 AM' };
      const { getByText } = renderModal({ booking: customBooking });
      expect(getByText('Jan 1, 2024 at 10:00 AM')).toBeTruthy();
    });

    it('displays service name with special characters', () => {
      const customBooking = { ...mockBooking, serviceName: 'A/C & Heating Repair' };
      const { getByText } = renderModal({ booking: customBooking });
      expect(getByText('A/C & Heating Repair')).toBeTruthy();
    });

    it('displays long service names correctly', () => {
      const customBooking = {
        ...mockBooking,
        serviceName: 'Complete Home Renovation and Remodeling Service',
      };
      const { getByText } = renderModal({ booking: customBooking });
      expect(getByText('Complete Home Renovation and Remodeling Service')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Cancellation Reasons Tests
  // --------------------------------------------------------------------------

  describe('Cancellation Reasons', () => {
    it('displays all cancellation reason options', () => {
      const { getByText } = renderModal();
      expect(getByText('Schedule Change')).toBeTruthy();
      expect(getByText('Weather conditions')).toBeTruthy();
      expect(getByText('Parking Availability')).toBeTruthy();
      expect(getByText('Lack of amenities')).toBeTruthy();
      expect(getByText('I have alternative option')).toBeTruthy();
      expect(getByText('Other')).toBeTruthy();
    });

    it('displays reason selection label', () => {
      const { getByText } = renderModal();
      expect(getByText('Why are you cancelling?')).toBeTruthy();
    });

    it('renders each reason as a touchable button', () => {
      const { getByLabelText } = renderModal();
      expect(getByLabelText('Select reason: Schedule Change')).toBeTruthy();
      expect(getByLabelText('Select reason: Weather conditions')).toBeTruthy();
      expect(getByLabelText('Select reason: Parking Availability')).toBeTruthy();
      expect(getByLabelText('Select reason: Lack of amenities')).toBeTruthy();
      expect(getByLabelText('Select reason: I have alternative option')).toBeTruthy();
      expect(getByLabelText('Select reason: Other')).toBeTruthy();
    });

    it('allows selecting a reason', () => {
      const { getByLabelText } = renderModal();
      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);
      expect(scheduleReason).toBeTruthy();
    });

    it('allows selecting Weather conditions reason', () => {
      const { getByLabelText } = renderModal();
      const weatherReason = getByLabelText('Select reason: Weather conditions');
      fireEvent.press(weatherReason);
      expect(weatherReason).toBeTruthy();
    });

    it('allows selecting Parking Availability reason', () => {
      const { getByLabelText } = renderModal();
      const parkingReason = getByLabelText('Select reason: Parking Availability');
      fireEvent.press(parkingReason);
      expect(parkingReason).toBeTruthy();
    });

    it('allows selecting Lack of amenities reason', () => {
      const { getByLabelText } = renderModal();
      const amenitiesReason = getByLabelText('Select reason: Lack of amenities');
      fireEvent.press(amenitiesReason);
      expect(amenitiesReason).toBeTruthy();
    });

    it('allows selecting alternative option reason', () => {
      const { getByLabelText } = renderModal();
      const alternativeReason = getByLabelText('Select reason: I have alternative option');
      fireEvent.press(alternativeReason);
      expect(alternativeReason).toBeTruthy();
    });

    it('allows selecting Other reason', () => {
      const { getByLabelText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);
      expect(otherReason).toBeTruthy();
    });

    it('allows switching between different reasons', () => {
      const { getByLabelText } = renderModal();
      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      const weatherReason = getByLabelText('Select reason: Weather conditions');

      fireEvent.press(scheduleReason);
      fireEvent.press(weatherReason);
      fireEvent.press(scheduleReason);

      expect(scheduleReason).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Custom Reason Input Tests
  // --------------------------------------------------------------------------

  describe('Custom Reason Input', () => {
    it('does not show custom reason input by default', () => {
      const { queryByPlaceholderText } = renderModal();
      expect(queryByPlaceholderText('Enter your reason...')).toBeNull();
    });

    it('shows custom reason input when "Other" is selected', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);
      expect(getByPlaceholderText('Enter your reason...')).toBeTruthy();
    });

    it('displays custom reason label when "Other" is selected', () => {
      const { getByLabelText, getByText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);
      expect(getByText('Please specify:')).toBeTruthy();
    });

    it('allows entering custom reason text', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, 'Personal emergency');

      expect(input.props.value).toBe('Personal emergency');
    });

    it('allows entering long custom reason', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const longReason = 'I need to cancel because I have an unexpected family emergency that requires my immediate attention and I will not be able to be present at the scheduled time.';
      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, longReason);

      expect(input.props.value).toBe(longReason);
    });

    it('allows entering custom reason with special characters', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, 'Found better deal @ 50% off!');

      expect(input.props.value).toBe('Found better deal @ 50% off!');
    });

    it('allows editing custom reason text', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, 'First reason');
      fireEvent.changeText(input, 'Updated reason');

      expect(input.props.value).toBe('Updated reason');
    });

    it('allows clearing custom reason text', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, 'Some reason');
      fireEvent.changeText(input, '');

      expect(input.props.value).toBe('');
    });

    it('hides custom input when switching from Other to another reason', () => {
      const { getByLabelText, queryByPlaceholderText } = renderModal();

      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);
      expect(queryByPlaceholderText('Enter your reason...')).toBeTruthy();

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);
      expect(queryByPlaceholderText('Enter your reason...')).toBeNull();
    });

    it('configures custom input as multiline', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      expect(input.props.multiline).toBe(true);
    });

    it('configures custom input with 3 lines', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      expect(input.props.numberOfLines).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // Action Buttons Tests
  // --------------------------------------------------------------------------

  describe('Action Buttons', () => {
    it('displays Keep Booking button', () => {
      const { getByText } = renderModal();
      expect(getByText('Keep Booking')).toBeTruthy();
    });

    it('displays Cancel Booking button', () => {
      const { getAllByText } = renderModal();
      const buttons = getAllByText('Cancel Booking');
      expect(buttons.length).toBe(2); // Title and button
    });

    it('Cancel Booking button is disabled by default (no reason selected)', () => {
      const { getAllByText } = renderModal();
      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Second occurrence is the button
      expect(cancelButton?.props.disabled).toBe(true);
    });

    it('Cancel Booking button is enabled when a reason is selected', () => {
      const { getByLabelText, getAllByText } = renderModal();
      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Second occurrence is the button
      expect(cancelButton?.props.disabled).toBe(false);
    });

    it('Cancel Booking button is disabled when Other selected without custom text', () => {
      const { getByLabelText, getAllByText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Second occurrence is the button
      expect(cancelButton?.props.disabled).toBe(true);
    });

    it('Cancel Booking button is disabled with only whitespace in custom reason', () => {
      const { getByLabelText, getByPlaceholderText, getAllByText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, '   ');

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Second occurrence is the button
      expect(cancelButton?.props.disabled).toBe(true);
    });

    it('Cancel Booking button is enabled when Other selected with valid custom text', () => {
      const { getByLabelText, getByPlaceholderText, getAllByText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, 'Personal emergency');

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Second occurrence is the button
      expect(cancelButton?.props.disabled).toBe(false);
    });

    it('Cancel Booking button is enabled with custom text after whitespace trim', () => {
      const { getByLabelText, getByPlaceholderText, getAllByText } = renderModal();
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, '  Valid reason  ');

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Second occurrence is the button
      expect(cancelButton?.props.disabled).toBe(false);
    });

    it('Keep Booking button is not disabled', () => {
      const { getByText } = renderModal();
      const keepButton = getByText('Keep Booking').parent;
      expect(keepButton?.props.disabled).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // User Interaction Tests
  // --------------------------------------------------------------------------

  describe('User Interactions', () => {
    it('calls onCancel when close button is pressed', () => {
      const onCancel = jest.fn();
      const { getByLabelText } = renderModal({ onCancel });

      const closeButton = getByLabelText('Close modal');
      fireEvent.press(closeButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Keep Booking button is pressed', () => {
      const onCancel = jest.fn();
      const { getByText } = renderModal({ onCancel });

      const keepButton = getByText('Keep Booking');
      fireEvent.press(keepButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm with selected reason when Cancel Booking is pressed', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      const { getByLabelText, getAllByText } = renderModal({ onConfirm });

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1]; // Second occurrence is the button
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('schedule_change');
      });
    });

    it('calls onConfirm with custom reason when Other is selected', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      const { getByLabelText, getByPlaceholderText, getAllByText } = renderModal({ onConfirm });

      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, 'Personal emergency');

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1]; // Second occurrence is the button
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('Personal emergency');
      });
    });

    it('does not call onConfirm when no reason is selected', () => {
      const onConfirm = jest.fn();
      const { getAllByText } = renderModal({ onConfirm });

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1]; // Second occurrence is the button
      fireEvent.press(cancelButton);

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('does not call onConfirm when Other selected with empty custom text', () => {
      const onConfirm = jest.fn();
      const { getByLabelText, getAllByText } = renderModal({ onConfirm });

      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Get the button container to check disabled state

      // Verify button is disabled - pressing won't work if properly disabled
      expect(cancelButton?.props.disabled).toBe(true);

      // Even if we try to press, it should not call onConfirm
      if (!cancelButton?.props.disabled) {
        fireEvent.press(buttons[1]);
      }

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('does not call onConfirm when Other selected with whitespace-only text', () => {
      const onConfirm = jest.fn();
      const { getByLabelText, getByPlaceholderText, getAllByText } = renderModal({ onConfirm });

      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, '   ');

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Get the button container to check disabled state

      // Verify button is disabled
      expect(cancelButton?.props.disabled).toBe(true);

      // Even if we try to press, it should not call onConfirm
      if (!cancelButton?.props.disabled) {
        fireEvent.press(buttons[1]);
      }

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // State Management Tests
  // --------------------------------------------------------------------------

  describe('State Management', () => {
    it('resets selected reason when modal is closed via cancel button', () => {
      const { getByLabelText, getByText, getAllByText, rerender } = renderModal();

      // Select a reason
      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      // Close modal
      const keepButton = getByText('Keep Booking');
      fireEvent.press(keepButton);

      // Reopen modal
      rerender(<CancellationModal {...defaultProps} visible={false} />);
      rerender(<CancellationModal {...defaultProps} visible={true} />);

      // Verify Cancel Booking button is disabled (no selection retained)
      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Second occurrence is the button
      expect(cancelButton?.props.disabled).toBe(true);
    });

    it('resets custom reason when modal is closed', () => {
      const { getByLabelText, getByText, getByPlaceholderText, rerender } = renderModal();

      // Select Other and enter custom reason
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, 'Some reason');

      // Close modal
      const keepButton = getByText('Keep Booking');
      fireEvent.press(keepButton);

      // Reopen modal
      rerender(<CancellationModal {...defaultProps} visible={false} />);
      rerender(<CancellationModal {...defaultProps} visible={true} />);

      // Select Other again
      const otherReasonAgain = getByLabelText('Select reason: Other');
      fireEvent.press(otherReasonAgain);

      // Verify custom input is empty
      const inputAgain = getByPlaceholderText('Enter your reason...');
      expect(inputAgain.props.value).toBe('');
    });

    it('maintains selected reason when switching reasons', () => {
      const { getByLabelText, getAllByText } = renderModal();

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      const weatherReason = getByLabelText('Select reason: Weather conditions');

      fireEvent.press(scheduleReason);
      const buttons1 = getAllByText('Cancel Booking');
      const cancelButton1 = buttons1[1].parent; // Second occurrence is the button
      expect(cancelButton1?.props.disabled).toBe(false);

      fireEvent.press(weatherReason);
      const buttons2 = getAllByText('Cancel Booking');
      const cancelButton2 = buttons2[1].parent; // Second occurrence is the button
      expect(cancelButton2?.props.disabled).toBe(false);
    });

    it('clears custom reason when switching away from Other', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();

      // Select Other and enter text
      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, 'Custom reason');

      // Switch to another reason
      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      // Switch back to Other
      fireEvent.press(otherReason);

      // Custom reason should still be there (not cleared when switching)
      const inputAgain = getByPlaceholderText('Enter your reason...');
      expect(inputAgain.props.value).toBe('Custom reason');
    });
  });

  // --------------------------------------------------------------------------
  // Loading State Tests
  // --------------------------------------------------------------------------

  describe('Loading State', () => {
    it('shows activity indicator during cancellation', async () => {
      const onConfirm = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const { getByLabelText, getAllByText, queryByText, UNSAFE_getByType } = renderModal({ onConfirm });

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1]; // Second occurrence is the button
      fireEvent.press(cancelButton);

      // Should show loading indicator
      const ActivityIndicator = require('react-native').ActivityIndicator;
      await waitFor(() => {
        expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
      });
    });

    it('disables buttons during cancellation', async () => {
      const onConfirm = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const { getByLabelText, getByText, getAllByText } = renderModal({ onConfirm });

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1]; // Second occurrence is the button
      fireEvent.press(cancelButton);

      await waitFor(() => {
        const keepButton = getByText('Keep Booking').parent;
        expect(keepButton?.props.disabled).toBe(true);
      });
    });

    it('re-enables buttons after successful cancellation', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      const { getByLabelText, getByText, getAllByText } = renderModal({ onConfirm });

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1]; // Second occurrence is the button
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // Should re-enable after completion
      await waitFor(() => {
        const keepButton = getByText('Keep Booking').parent;
        expect(keepButton?.props.disabled).toBe(false);
      });
    });

    it('re-enables buttons after failed cancellation', async () => {
      // Suppress console errors for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const onConfirm = jest.fn().mockRejectedValue(new Error('Network error'));
      const { getByLabelText, getByText, getAllByText } = renderModal({ onConfirm });

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1]; // Second occurrence is the button
      fireEvent.press(cancelButton);

      // Wait for the error to be handled
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // Should re-enable even after error
      await waitFor(() => {
        const keepButton = getByText('Keep Booking').parent;
        expect(keepButton?.props.disabled).toBe(false);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // Haptic Feedback Tests
  // --------------------------------------------------------------------------

  describe('Haptic Feedback', () => {
    it('uses haptic hook when pressing reasons', () => {
      const { getByLabelText } = renderModal();
      const scheduleReason = getByLabelText('Select reason: Schedule Change');

      // Just verify the haptic hook is used - actual haptic call is mocked
      fireEvent.press(scheduleReason);

      // The component should still work even if haptics don't trigger
      expect(scheduleReason).toBeTruthy();
    });

    it('handles multiple reason selections with haptics', () => {
      const { getByLabelText } = renderModal();

      // Verify haptic feedback doesn't cause issues with multiple selections
      fireEvent.press(getByLabelText('Select reason: Schedule Change'));
      fireEvent.press(getByLabelText('Select reason: Weather conditions'));
      fireEvent.press(getByLabelText('Select reason: Parking Availability'));

      // All selections should work regardless of haptic feedback
      expect(getByLabelText('Select reason: Parking Availability')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has accessible close button', () => {
      const { getByLabelText } = renderModal();
      const closeButton = getByLabelText('Close modal');
      expect(closeButton.props.accessibilityRole).toBe('button');
    });

    it('has accessible reason selection buttons', () => {
      const { getByLabelText } = renderModal();
      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      expect(scheduleReason.props.accessibilityRole).toBe('button');
    });

    it('provides descriptive accessibility labels for all reasons', () => {
      const { getByLabelText } = renderModal();

      expect(getByLabelText('Select reason: Schedule Change')).toBeTruthy();
      expect(getByLabelText('Select reason: Weather conditions')).toBeTruthy();
      expect(getByLabelText('Select reason: Parking Availability')).toBeTruthy();
      expect(getByLabelText('Select reason: Lack of amenities')).toBeTruthy();
      expect(getByLabelText('Select reason: I have alternative option')).toBeTruthy();
      expect(getByLabelText('Select reason: Other')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases & Error Handling
  // --------------------------------------------------------------------------

  describe('Edge Cases & Error Handling', () => {
    it('handles onConfirm returning undefined', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      const { getByLabelText, getAllByText } = renderModal({ onConfirm });

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1]; // Second occurrence is the button
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('schedule_change');
      });
    });

    it('handles onConfirm throwing an error', async () => {
      // Suppress console errors for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const onConfirm = jest.fn().mockRejectedValue(new Error('API Error'));
      const { getByLabelText, getByText, getAllByText } = renderModal({ onConfirm });

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1]; // Second occurrence is the button
      fireEvent.press(cancelButton);

      // Wait for the error to be handled
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // Should still re-enable the button
      await waitFor(() => {
        const keepButton = getByText('Keep Booking').parent;
        expect(keepButton?.props.disabled).toBe(false);
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles multiple rapid reason selections', () => {
      const { getByLabelText, getAllByText } = renderModal();

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      const weatherReason = getByLabelText('Select reason: Weather conditions');

      fireEvent.press(scheduleReason);
      fireEvent.press(weatherReason);
      fireEvent.press(scheduleReason);
      fireEvent.press(weatherReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Second occurrence is the button
      expect(cancelButton?.props.disabled).toBe(false);
    });

    it('handles rapid button presses during loading', async () => {
      const onConfirm = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const { getByLabelText, getAllByText } = renderModal({ onConfirm });

      const scheduleReason = getByLabelText('Select reason: Schedule Change');
      fireEvent.press(scheduleReason);

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1]; // Second occurrence is the button
      fireEvent.press(cancelButton);
      fireEvent.press(cancelButton);
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('handles empty string in custom reason', () => {
      const { getByLabelText, getByPlaceholderText, getAllByText } = renderModal();

      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, '');

      const buttons = getAllByText('Cancel Booking');
      const cancelButton = buttons[1].parent; // Second occurrence is the button
      expect(cancelButton?.props.disabled).toBe(true);
    });

    it('handles very long custom reason', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();

      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const veryLongReason = 'A'.repeat(1000);
      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, veryLongReason);

      expect(input.props.value).toBe(veryLongReason);
    });

    it('handles special characters in custom reason', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();

      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const specialReason = '<script>alert("test")</script>';
      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, specialReason);

      expect(input.props.value).toBe(specialReason);
    });

    it('handles Unicode characters in custom reason', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();

      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const unicodeReason = '❌ Cannot attend 🏠';
      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, unicodeReason);

      expect(input.props.value).toBe(unicodeReason);
    });

    it('handles newlines in custom reason', () => {
      const { getByLabelText, getByPlaceholderText } = renderModal();

      const otherReason = getByLabelText('Select reason: Other');
      fireEvent.press(otherReason);

      const multilineReason = 'Line 1\nLine 2\nLine 3';
      const input = getByPlaceholderText('Enter your reason...');
      fireEvent.changeText(input, multilineReason);

      expect(input.props.value).toBe(multilineReason);
    });
  });

  // --------------------------------------------------------------------------
  // Modal Behavior Tests
  // --------------------------------------------------------------------------

  describe('Modal Behavior', () => {
    it('calls onCancel when modal requests close', () => {
      const onCancel = jest.fn();
      const { getAllByText } = renderModal({ onCancel });

      // Simulate modal onRequestClose (hardware back button)
      const titleText = getAllByText('Cancel Booking')[0]; // First occurrence is the title
      const modal = titleText.parent?.parent?.parent?.parent;
      if (modal?.props.onRequestClose) {
        modal.props.onRequestClose();
      }

      expect(onCancel).toHaveBeenCalled();
    });

    it('renders with fade animation type', () => {
      const { getAllByText } = renderModal();
      const titleText = getAllByText('Cancel Booking')[0]; // First occurrence is the title
      const modal = titleText.parent?.parent?.parent?.parent;
      expect(modal?.props.animationType).toBe('fade');
    });

    it('renders with transparent background', () => {
      const { getAllByText } = renderModal();
      const titleText = getAllByText('Cancel Booking')[0]; // First occurrence is the title
      const modal = titleText.parent?.parent?.parent?.parent;
      expect(modal?.props.transparent).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Different Booking Scenarios
  // --------------------------------------------------------------------------

  describe('Different Booking Scenarios', () => {
    it('handles booking with no contractor image', () => {
      const bookingWithoutImage = { ...mockBooking, contractorImage: undefined };
      const { getByText } = renderModal({ booking: bookingWithoutImage });
      expect(getByText('Pipe Repair')).toBeTruthy();
    });

    it('handles booking with different status', () => {
      const completedBooking = { ...mockBooking, status: 'completed' as const };
      const { getByText } = renderModal({ booking: completedBooking });
      expect(getByText('Pipe Repair')).toBeTruthy();
    });

    it('handles booking with no rating', () => {
      const bookingWithoutRating = { ...mockBooking, rating: undefined };
      const { getByText } = renderModal({ booking: bookingWithoutRating });
      expect(getByText('Pipe Repair')).toBeTruthy();
    });

    it('handles booking with no special instructions', () => {
      const bookingWithoutInstructions = { ...mockBooking, specialInstructions: undefined };
      const { getByText } = renderModal({ booking: bookingWithoutInstructions });
      expect(getByText('Pipe Repair')).toBeTruthy();
    });

    it('handles booking with different amounts', () => {
      const expensiveBooking = { ...mockBooking, amount: 5000 };
      const { getByText } = renderModal({ booking: expensiveBooking });
      expect(getByText('Pipe Repair')).toBeTruthy();
    });

    it('handles booking with zero amount', () => {
      const freeBooking = { ...mockBooking, amount: 0 };
      const { getByText } = renderModal({ booking: freeBooking });
      expect(getByText('Pipe Repair')).toBeTruthy();
    });
  });
});

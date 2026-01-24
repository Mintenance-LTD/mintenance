import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ConnectButton from '../ConnectButton';
import { MutualConnectionsService } from '../../services/MutualConnectionsService';
import { logger } from '../../utils/logger';
import { ConnectionStatus } from '@mintenance/types';

// Mock dependencies
jest.mock('../../services/MutualConnectionsService', () => ({
  MutualConnectionsService: {
    getConnectionStatus: jest.fn(),
    sendConnectionRequest: jest.fn(),
    getConnectionRequests: jest.fn(),
    rejectConnectionRequest: jest.fn(),
  },
}));

jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
  }),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return <View testID="Ionicons" {...props} />;
  },
}));

// Create a spy on Alert
const alertSpy = jest.spyOn(Alert, 'alert');

describe('ConnectButton', () => {
  const defaultProps = {
    currentUserId: 'user-123',
    targetUserId: 'target-456',
    targetUserName: 'John Doe',
    targetUserRole: 'contractor' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
  });

  describe('Rendering', () => {
    it('should return null when currentUserId equals targetUserId', async () => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);

      const { toJSON } = render(
        <ConnectButton
          {...defaultProps}
          currentUserId="same-user"
          targetUserId="same-user"
        />
      );

      await waitFor(() => {
        expect(toJSON()).toBeNull();
      });
    });

    it('should show loading indicator during initial status load', () => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ConnectButton {...defaultProps} />);

      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('should load connection status on mount', async () => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(MutualConnectionsService.getConnectionStatus).toHaveBeenCalledWith(
          'user-123',
          'target-456'
        );
      });
    });

    it('should reload connection status when currentUserId changes', async () => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);

      const { rerender } = render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(MutualConnectionsService.getConnectionStatus).toHaveBeenCalledTimes(1);
      });

      rerender(<ConnectButton {...defaultProps} currentUserId="new-user-789" />);

      await waitFor(() => {
        expect(MutualConnectionsService.getConnectionStatus).toHaveBeenCalledTimes(2);
        expect(MutualConnectionsService.getConnectionStatus).toHaveBeenLastCalledWith(
          'new-user-789',
          'target-456'
        );
      });
    });

    it('should reload connection status when targetUserId changes', async () => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);

      const { rerender } = render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(MutualConnectionsService.getConnectionStatus).toHaveBeenCalledTimes(1);
      });

      rerender(<ConnectButton {...defaultProps} targetUserId="new-target-999" />);

      await waitFor(() => {
        expect(MutualConnectionsService.getConnectionStatus).toHaveBeenCalledTimes(2);
        expect(MutualConnectionsService.getConnectionStatus).toHaveBeenLastCalledWith(
          'user-123',
          'new-target-999'
        );
      });
    });

    it('should log error and continue if initial status load fails', async () => {
      const error = new Error('Network error');
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockRejectedValue(error);

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Error loading connection status:', error);
      });

      // Should still render the button with default state
      expect(screen.getByText('Connect')).toBeTruthy();
    });
  });

  describe('Connection State: null (not connected)', () => {
    beforeEach(() => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);
    });

    it('should render Connect button with correct text', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeTruthy();
      });
    });

    it('should have correct accessibility label', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.accessibilityLabel).toBe('Connect with John Doe');
      });
    });

    it('should render person-add icon', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const icon = screen.getByTestId('Ionicons');
        expect(icon.props.name).toBe('person-add');
      });
    });

    it('should not be disabled', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.disabled).toBeFalsy();
      });
    });
  });

  describe('Connection State: pending', () => {
    beforeEach(() => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue('pending');
    });

    it('should render Pending button with correct text', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeTruthy();
      });
    });

    it('should have correct accessibility label', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.accessibilityLabel).toBe('Pending with John Doe');
      });
    });

    it('should render time icon', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const icon = screen.getByTestId('Ionicons');
        expect(icon.props.name).toBe('time');
      });
    });

    it('should not be disabled', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.disabled).toBeFalsy();
      });
    });
  });

  describe('Connection State: accepted', () => {
    beforeEach(() => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue('accepted');
    });

    it('should render Connected button with correct text', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeTruthy();
      });
    });

    it('should have correct accessibility label', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.accessibilityLabel).toBe('Connected with John Doe');
      });
    });

    it('should render checkmark-circle icon', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const icon = screen.getByTestId('Ionicons');
        expect(icon.props.name).toBe('checkmark-circle');
      });
    });

    it('should not be disabled', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.disabled).toBeFalsy();
      });
    });
  });

  describe('Connection State: blocked', () => {
    beforeEach(() => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue('blocked');
    });

    it('should render Blocked button with correct text', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Blocked')).toBeTruthy();
      });
    });

    it('should have correct accessibility label', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.accessibilityLabel).toBe('Blocked with John Doe');
      });
    });

    it('should render ban icon', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const icon = screen.getByTestId('Ionicons');
        expect(icon.props.name).toBe('ban');
      });
    });

    it('should be disabled', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.disabled).toBeTruthy();
      });
    });

    it('should not trigger any action when pressed', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        fireEvent.press(button);
      });

      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe('Size Variants', () => {
    beforeEach(() => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);
    });

    it('should apply small size styles', async () => {
      render(<ConnectButton {...defaultProps} size="small" />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              paddingVertical: 6,
              paddingHorizontal: 12,
            }),
          ])
        );
      });
    });

    it('should apply medium size styles by default', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              paddingVertical: 10,
              paddingHorizontal: 16,
            }),
          ])
        );
      });
    });

    it('should apply large size styles', async () => {
      render(<ConnectButton {...defaultProps} size="large" />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              paddingVertical: 16,
              paddingHorizontal: 24,
            }),
          ])
        );
      });
    });
  });

  describe('Send Connection Request', () => {
    beforeEach(() => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);
      (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockResolvedValue(undefined);
    });

    it('should send connection request when Connect button is pressed', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByText('Connect');
        fireEvent.press(button);
      });

      await waitFor(() => {
        expect(MutualConnectionsService.sendConnectionRequest).toHaveBeenCalledWith(
          'user-123',
          'target-456',
          "Hi John Doe, I'd like to connect with you on Mintenance!"
        );
      });
    });

    it('should update connection status to pending after successful request', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Connect'));
      });

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeTruthy();
      });
    });

    it('should show success alert after sending request', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Connect'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Request Sent!',
          'Your connection request has been sent to John Doe.',
          [{ text: 'OK' }]
        );
      });
    });

    it('should call onConnectionChange callback with pending status', async () => {
      const onConnectionChange = jest.fn();
      render(<ConnectButton {...defaultProps} onConnectionChange={onConnectionChange} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Connect'));
      });

      await waitFor(() => {
        expect(onConnectionChange).toHaveBeenCalledWith('pending');
      });
    });

    it('should show loading indicator while sending request', async () => {
      (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Connect'));
      });

      // Should show loading indicator immediately
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();

      await waitFor(() => {
        expect(screen.queryByTestId('activity-indicator')).toBeFalsy();
      });
    });

    it('should disable button while sending request', async () => {
      (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ConnectButton {...defaultProps} />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeTruthy();
      });

      // Press the button
      const button = screen.getByTestId('connect-button');
      fireEvent.press(button);

      // Button should be disabled while loading
      await waitFor(() => {
        const updatedButton = screen.getByTestId('connect-button');
        expect(updatedButton.props.disabled).toBeTruthy();
      });

      // Button should be enabled after request completes
      await waitFor(() => {
        const updatedButton = screen.getByTestId('connect-button');
        expect(updatedButton.props.disabled).toBeFalsy();
      }, { timeout: 3000 });
    });

    it('should show error alert when request fails', async () => {
      const error = new Error('Network error');
      (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockRejectedValue(error);

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Connect'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          'Failed to send connection request. Please try again.',
          [{ text: 'OK' }]
        );
      });
    });

    it('should show specific error when connection already exists', async () => {
      const error = new Error('Connection already exists');
      (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockRejectedValue(error);

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Connect'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          'A connection request has already been sent or you are already connected.',
          [{ text: 'OK' }]
        );
      });
    });

    it('should log error when request fails', async () => {
      const error = new Error('Network error');
      (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockRejectedValue(error);

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Connect'));
      });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Error sending connection request:', error);
      });
    });

    it('should not change status when request fails', async () => {
      (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Connect'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      // Should still show Connect button
      expect(screen.getByText('Connect')).toBeTruthy();
    });
  });

  describe('Cancel Connection Request', () => {
    const mockPendingRequest = {
      id: 'request-123',
      requesterId: 'user-123',
      recipientId: 'target-456',
      status: 'pending' as const,
      createdAt: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue('pending');
      (MutualConnectionsService.getConnectionRequests as jest.Mock).mockResolvedValue([
        mockPendingRequest,
      ]);
      (MutualConnectionsService.rejectConnectionRequest as jest.Mock).mockResolvedValue(undefined);
    });

    it('should show confirmation alert when Pending button is pressed', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Pending'));
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Cancel Request',
        'Are you sure you want to cancel your connection request to John Doe?',
        expect.arrayContaining([
          { text: 'No', style: 'cancel' },
          expect.objectContaining({
            text: 'Yes, Cancel',
            style: 'destructive',
          }),
        ])
      );
    });

    it('should cancel request when user confirms', async () => {
      alertSpy.mockImplementation((title, message, buttons) => {
        // Simulate pressing "Yes, Cancel"
        const yesButton = buttons?.find((b: any) => b.text === 'Yes, Cancel');
        if (yesButton?.onPress) {
          yesButton.onPress();
        }
      });

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Pending'));
      });

      await waitFor(() => {
        expect(MutualConnectionsService.getConnectionRequests).toHaveBeenCalledWith('target-456');
        expect(MutualConnectionsService.rejectConnectionRequest).toHaveBeenCalledWith(
          'request-123'
        );
      });
    });

    it('should update status to null after canceling request', async () => {
      alertSpy.mockImplementation((title, message, buttons) => {
        const yesButton = buttons?.find((b: any) => b.text === 'Yes, Cancel');
        if (yesButton?.onPress) {
          yesButton.onPress();
        }
      });

      const { rerender } = render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeTruthy();
      });

      // Mock the status to null after cancellation
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);

      fireEvent.press(screen.getByText('Pending'));

      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeTruthy();
      });
    });

    it('should call onConnectionChange with null after canceling', async () => {
      const onConnectionChange = jest.fn();
      alertSpy.mockImplementation((title, message, buttons) => {
        const yesButton = buttons?.find((b: any) => b.text === 'Yes, Cancel');
        if (yesButton?.onPress) {
          yesButton.onPress();
        }
      });

      render(<ConnectButton {...defaultProps} onConnectionChange={onConnectionChange} />);

      await waitFor(() => {
        expect(onConnectionChange).toHaveBeenCalledWith('pending');
      });

      onConnectionChange.mockClear();

      fireEvent.press(screen.getByText('Pending'));

      await waitFor(() => {
        expect(onConnectionChange).toHaveBeenCalledWith(null);
      });
    });

    it('should show error alert when cancel fails', async () => {
      (MutualConnectionsService.rejectConnectionRequest as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      alertSpy.mockImplementation((title, message, buttons) => {
        if (title === 'Cancel Request') {
          const yesButton = buttons?.find((b: any) => b.text === 'Yes, Cancel');
          if (yesButton?.onPress) {
            yesButton.onPress();
          }
        }
      });

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Pending'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          'Failed to cancel request. Please try again.'
        );
      });
    });

    it('should log error when cancel fails', async () => {
      const error = new Error('Network error');
      (MutualConnectionsService.rejectConnectionRequest as jest.Mock).mockRejectedValue(error);

      alertSpy.mockImplementation((title, message, buttons) => {
        if (title === 'Cancel Request') {
          const yesButton = buttons?.find((b: any) => b.text === 'Yes, Cancel');
          if (yesButton?.onPress) {
            yesButton.onPress();
          }
        }
      });

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Pending'));
      });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Error canceling connection request:', error);
      });
    });

    it('should handle case when no pending request is found', async () => {
      (MutualConnectionsService.getConnectionRequests as jest.Mock).mockResolvedValue([]);

      alertSpy.mockImplementation((title, message, buttons) => {
        if (title === 'Cancel Request') {
          const yesButton = buttons?.find((b: any) => b.text === 'Yes, Cancel');
          if (yesButton?.onPress) {
            yesButton.onPress();
          }
        }
      });

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Pending'));
      });

      await waitFor(() => {
        expect(MutualConnectionsService.getConnectionRequests).toHaveBeenCalled();
      });

      // Should not call reject if no request found
      expect(MutualConnectionsService.rejectConnectionRequest).not.toHaveBeenCalled();
    });
  });

  describe('Connected State Interaction', () => {
    beforeEach(() => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue('accepted');
    });

    it('should show info alert when Connected button is pressed', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Connected'));
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Connected',
        'You are connected with John Doe. You can message them anytime!',
        [{ text: 'OK' }]
      );
    });

    it('should not change status when Connected button is pressed', async () => {
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Connected'));
      });

      // Should still show Connected
      expect(screen.getByText('Connected')).toBeTruthy();
    });
  });

  describe('Callback Integration', () => {
    it('should call onConnectionChange on initial status load', async () => {
      const onConnectionChange = jest.fn();
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue('accepted');

      render(<ConnectButton {...defaultProps} onConnectionChange={onConnectionChange} />);

      await waitFor(() => {
        expect(onConnectionChange).toHaveBeenCalledWith('accepted');
      });
    });

    it('should not call onConnectionChange if not provided', async () => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);

      // Should not throw error
      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeTruthy();
      });
    });
  });

  describe('Custom Styling', () => {
    beforeEach(() => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);
    });

    it('should apply custom style prop', async () => {
      const customStyle = { marginTop: 20, marginBottom: 10 };

      render(<ConnectButton {...defaultProps} style={customStyle} />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.style).toEqual(expect.arrayContaining([customStyle]));
      });
    });
  });

  describe('Different Target User Roles', () => {
    beforeEach(() => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);
    });

    it('should work with homeowner role', async () => {
      render(<ConnectButton {...defaultProps} targetUserRole="homeowner" />);

      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeTruthy();
      });
    });

    it('should work with contractor role', async () => {
      render(<ConnectButton {...defaultProps} targetUserRole="contractor" />);

      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid status changes', async () => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);
      (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockResolvedValue(undefined);

      const { rerender } = render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeTruthy();
      });

      // Simulate sending request
      fireEvent.press(screen.getByText('Connect'));

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeTruthy();
      });

      // Simulate status changing to accepted
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue('accepted');
      rerender(<ConnectButton {...defaultProps} targetUserId="target-789" />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeTruthy();
      });
    });

    it('should handle empty target user name gracefully', async () => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);

      render(<ConnectButton {...defaultProps} targetUserName="" />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.accessibilityLabel).toBe('Connect with ');
      });
    });

    it('should prevent multiple simultaneous requests', async () => {
      (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);
      (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ConnectButton {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByText('Connect');
        fireEvent.press(button);
        fireEvent.press(button); // Second press while loading
      });

      await waitFor(() => {
        // Should only be called once
        expect(MutualConnectionsService.sendConnectionRequest).toHaveBeenCalledTimes(1);
      });
    });
  });
});

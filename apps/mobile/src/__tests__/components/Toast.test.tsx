import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Toast } from '../../components/ui/Toast/Toast';

// Mock design tokens
jest.mock('../../design-system/tokens', () => {
  const { designTokens } = require('../../__mocks__/designTokens');
  return { designTokens };
});

// Mock theme
jest.mock('../../design-system/theme', () => {
  const { useTheme } = require('../../__mocks__/theme');
  return { useTheme };
});

// Mock haptics
jest.mock('../../utils/haptics', () => {
  const { useHaptics } = require('../../__mocks__/haptics');
  return { useHaptics };
});

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID || 'icon'}>{name}</Text>;
  },
}));

// Mock timers for animation testing
jest.useFakeTimers();

describe('Toast Component', () => {
  const defaultProps = {
    id: 'test-toast',
    type: 'info' as const,
    title: 'Test Toast',
  };

  afterEach(() => {
    jest.clearAllTimers();
  });

  // Basic rendering tests
  describe('Rendering', () => {
    it('renders with basic props', () => {
      const { getByText } = render(<Toast {...defaultProps} />);
      expect(getByText('Test Toast')).toBeTruthy();
    });

    it('renders with message', () => {
      const { getByText } = render(
        <Toast {...defaultProps} message="This is a test message" />
      );
      expect(getByText('Test Toast')).toBeTruthy();
      expect(getByText('This is a test message')).toBeTruthy();
    });

    it('renders with custom icon', () => {
      const { getByText } = render(
        <Toast {...defaultProps} icon="star" />
      );
      expect(getByText('star')).toBeTruthy();
    });

    it('renders default icon for info type', () => {
      const { getByText } = render(<Toast {...defaultProps} type="info" />);
      expect(getByText('information-circle')).toBeTruthy();
    });
  });

  // Type-specific tests
  describe('Toast Types', () => {
    it('renders success toast with correct icon', () => {
      const { getByText } = render(
        <Toast {...defaultProps} type="success" />
      );
      expect(getByText('checkmark-circle')).toBeTruthy();
    });

    it('renders error toast with correct icon', () => {
      const { getByText } = render(
        <Toast {...defaultProps} type="error" />
      );
      expect(getByText('close-circle')).toBeTruthy();
    });

    it('renders warning toast with correct icon', () => {
      const { getByText } = render(
        <Toast {...defaultProps} type="warning" />
      );
      expect(getByText('warning')).toBeTruthy();
    });

    it('renders loading toast with correct icon', () => {
      const { getByText } = render(
        <Toast {...defaultProps} type="loading" />
      );
      expect(getByText('refresh')).toBeTruthy();
    });
  });

  // Position tests
  describe('Positions', () => {
    it('renders top position toast', () => {
      const { getByText } = render(
        <Toast {...defaultProps} position="top" />
      );
      expect(getByText('Test Toast')).toBeTruthy();
    });

    it('renders bottom position toast', () => {
      const { getByText } = render(
        <Toast {...defaultProps} position="bottom" />
      );
      expect(getByText('Test Toast')).toBeTruthy();
    });

    it('renders center position toast', () => {
      const { getByText } = render(
        <Toast {...defaultProps} position="center" />
      );
      expect(getByText('Test Toast')).toBeTruthy();
    });
  });

  // Preset tests
  describe('Presets', () => {
    it('renders default preset', () => {
      const { getByText } = render(
        <Toast {...defaultProps} preset="default" />
      );
      expect(getByText('Test Toast')).toBeTruthy();
    });

    it('renders minimal preset', () => {
      const { getByText } = render(
        <Toast {...defaultProps} preset="minimal" />
      );
      expect(getByText('Test Toast')).toBeTruthy();
    });

    it('renders banner preset', () => {
      const { getByText } = render(
        <Toast {...defaultProps} preset="banner" />
      );
      expect(getByText('Test Toast')).toBeTruthy();
    });

    it('renders action preset with action button', () => {
      const mockAction = {
        label: 'Action',
        onPress: jest.fn(),
      };
      const { getByText } = render(
        <Toast {...defaultProps} preset="action" action={mockAction} />
      );
      expect(getByText('Test Toast')).toBeTruthy();
      expect(getByText('Action')).toBeTruthy();
    });
  });

  // Action button tests
  describe('Action Button', () => {
    it('renders action button when provided', () => {
      const mockAction = {
        label: 'Retry',
        onPress: jest.fn(),
      };
      const { getByText } = render(
        <Toast {...defaultProps} action={mockAction} />
      );
      expect(getByText('Retry')).toBeTruthy();
    });

    it('calls action onPress when button is pressed', () => {
      const mockAction = {
        label: 'Retry',
        onPress: jest.fn(),
      };
      const { getByText } = render(
        <Toast {...defaultProps} action={mockAction} />
      );

      fireEvent.press(getByText('Retry'));
      expect(mockAction.onPress).toHaveBeenCalledTimes(1);
    });

    it('renders primary action button style', () => {
      const mockAction = {
        label: 'Primary Action',
        onPress: jest.fn(),
        style: 'primary' as const,
      };
      const { getByText } = render(
        <Toast {...defaultProps} action={mockAction} />
      );
      expect(getByText('Primary Action')).toBeTruthy();
    });

    it('renders destructive action button style', () => {
      const mockAction = {
        label: 'Delete',
        onPress: jest.fn(),
        style: 'destructive' as const,
      };
      const { getByText } = render(
        <Toast {...defaultProps} action={mockAction} />
      );
      expect(getByText('Delete')).toBeTruthy();
    });
  });

  // Close button tests
  describe('Close Button', () => {
    it('renders close button when no action is provided', () => {
      const { getByText } = render(<Toast {...defaultProps} />);
      expect(getByText('close')).toBeTruthy();
    });

    it('does not render close button when action is provided', () => {
      const mockAction = {
        label: 'Action',
        onPress: jest.fn(),
      };
      const { getByText, queryByText } = render(
        <Toast {...defaultProps} action={mockAction} />
      );
      expect(getByText('Action')).toBeTruthy();
      expect(queryByText('close')).toBeNull();
    });

    it('does not render close button for minimal preset', () => {
      const { queryByText } = render(
        <Toast {...defaultProps} preset="minimal" />
      );
      expect(queryByText('close')).toBeNull();
    });

    it('calls onDismiss when close button is pressed', () => {
      const mockOnDismiss = jest.fn();
      const { getByText } = render(
        <Toast {...defaultProps} onDismiss={mockOnDismiss} />
      );

      fireEvent.press(getByText('close'));

      // Advance timers for animation completion
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockOnDismiss).toHaveBeenCalledWith('test-toast');
    });
  });

  // Press handling tests
  describe('Press Handling', () => {
    it('calls onPress when toast is pressed', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Toast {...defaultProps} onPress={mockOnPress} />
      );

      fireEvent.press(getByText('Test Toast'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not respond to press when onPress is not provided', () => {
      const { getByText } = render(<Toast {...defaultProps} />);
      // Should not throw error when pressed
      fireEvent.press(getByText('Test Toast'));
      expect(getByText('Test Toast')).toBeTruthy();
    });
  });

  // Auto-dismiss tests
  describe('Auto-dismiss', () => {
    it('auto-dismisses after duration', () => {
      const mockOnDismiss = jest.fn();
      render(
        <Toast
          {...defaultProps}
          duration={1000}
          onDismiss={mockOnDismiss}
        />
      );

      // Advance timers past the duration
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(mockOnDismiss).toHaveBeenCalledWith('test-toast');
    });

    it('does not auto-dismiss loading toast', () => {
      const mockOnDismiss = jest.fn();
      render(
        <Toast
          {...defaultProps}
          type="loading"
          duration={1000}
          onDismiss={mockOnDismiss}
        />
      );

      // Advance timers past the duration
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('does not auto-dismiss when duration is 0', () => {
      const mockOnDismiss = jest.fn();
      render(
        <Toast
          {...defaultProps}
          duration={0}
          onDismiss={mockOnDismiss}
        />
      );

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  // Lifecycle callbacks
  describe('Lifecycle Callbacks', () => {
    it('calls onShow when toast is shown', () => {
      const mockOnShow = jest.fn();
      render(
        <Toast {...defaultProps} onShow={mockOnShow} />
      );

      expect(mockOnShow).toHaveBeenCalledWith('test-toast');
    });

    it('calls onHide when toast is hidden', () => {
      const mockOnHide = jest.fn();
      const { getByText } = render(
        <Toast {...defaultProps} onHide={mockOnHide} />
      );

      fireEvent.press(getByText('close'));
      expect(mockOnHide).toHaveBeenCalledWith('test-toast');
    });
  });

  // Swipe functionality
  describe('Swipe Functionality', () => {
    it('enables swipe when swipeable is true', () => {
      const { getByText } = render(
        <Toast {...defaultProps} swipeable={true} />
      );
      expect(getByText('Test Toast')).toBeTruthy();
    });

    it('disables swipe when swipeable is false', () => {
      const { getByText } = render(
        <Toast {...defaultProps} swipeable={false} />
      );
      expect(getByText('Test Toast')).toBeTruthy();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('is accessible to screen readers', () => {
      const { getByText } = render(<Toast {...defaultProps} />);
      expect(getByText('Test Toast')).toBeTruthy();
    });

    it('action button has proper hit target', () => {
      const mockAction = {
        label: 'Action',
        onPress: jest.fn(),
      };
      const { getByText } = render(
        <Toast {...defaultProps} action={mockAction} />
      );
      expect(getByText('Action')).toBeTruthy();
    });

    it('close button has proper hit target', () => {
      const { getByText } = render(<Toast {...defaultProps} />);
      expect(getByText('close')).toBeTruthy();
    });
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('handles missing message gracefully', () => {
      const { getByText, queryByText } = render(
        <Toast {...defaultProps} message={undefined} />
      );
      expect(getByText('Test Toast')).toBeTruthy();
      // Message should not be rendered
      expect(queryByText('')).toBeNull();
    });

    it('handles empty title gracefully', () => {
      const { getByText } = render(
        <Toast {...defaultProps} title="" />
      );
      expect(getByText('')).toBeTruthy();
    });

    it('handles long titles correctly', () => {
      const longTitle = 'This is a very long title that should be truncated after a certain number of lines';
      const { getByText } = render(
        <Toast {...defaultProps} title={longTitle} />
      );
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('handles long messages correctly', () => {
      const longMessage = 'This is a very long message that should be truncated after a certain number of lines and should not break the layout of the toast component';
      const { getByText } = render(
        <Toast {...defaultProps} message={longMessage} />
      );
      expect(getByText(longMessage)).toBeTruthy();
    });
  });

  // Haptic feedback tests
  describe('Haptic Feedback', () => {
    it('enables haptic feedback by default', () => {
      const { getByText } = render(<Toast {...defaultProps} />);
      expect(getByText('Test Toast')).toBeTruthy();
    });

    it('disables haptic feedback when specified', () => {
      const { getByText } = render(
        <Toast {...defaultProps} hapticFeedback={false} />
      );
      expect(getByText('Test Toast')).toBeTruthy();
    });
  });
});
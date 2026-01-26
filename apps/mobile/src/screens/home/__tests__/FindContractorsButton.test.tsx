/**
 * Comprehensive tests for FindContractorsButton component
 *
 * Tests cover:
 * - Rendering behavior
 * - Visibility control
 * - User interactions
 * - Haptic feedback
 * - Accessibility
 * - Styling and layout
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FindContractorsButton } from '../FindContractorsButton';
import { HapticService } from '../../../utils/haptics';

// Mock HapticService
const mockButtonPress = jest.fn();
const mockLight = jest.fn();
const mockMedium = jest.fn();

jest.mock('../../../utils/haptics', () => ({
  HapticService: {
    buttonPress: jest.fn(),
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
  },
  useHaptics: () => ({
    buttonPress: mockButtonPress,
    light: mockLight,
    medium: mockMedium,
  }),
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('FindContractorsButton', () => {
  const defaultProps = {
    visible: true,
    onPress: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockButtonPress.mockClear();
    mockLight.mockClear();
    mockMedium.mockClear();
  });

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  describe('Rendering', () => {
    it('should render without crashing when visible', () => {
      const { getByText } = render(<FindContractorsButton {...defaultProps} />);
      expect(getByText('Find Contractors')).toBeTruthy();
    });

    it('should render null when not visible', () => {
      const { queryByText } = render(
        <FindContractorsButton {...defaultProps} visible={false} />
      );
      expect(queryByText('Find Contractors')).toBeNull();
    });

    it('should render main button with correct text', () => {
      const { getByText } = render(<FindContractorsButton {...defaultProps} />);
      const buttonText = getByText('Find Contractors');
      expect(buttonText).toBeTruthy();
    });

    it('should render dismiss button', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const dismissButton = screen.getByLabelText('Dismiss');
      expect(dismissButton).toBeTruthy();
    });

    it('should render search icon', () => {
      const { UNSAFE_getAllByType } = render(<FindContractorsButton {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // VISIBILITY TESTS
  // ============================================================================

  describe('Visibility Control', () => {
    it('should show button when visible is true', () => {
      const { getByText } = render(
        <FindContractorsButton {...defaultProps} visible={true} />
      );
      expect(getByText('Find Contractors')).toBeTruthy();
    });

    it('should hide button when visible is false', () => {
      const { queryByText } = render(
        <FindContractorsButton {...defaultProps} visible={false} />
      );
      expect(queryByText('Find Contractors')).toBeNull();
    });

    it('should toggle visibility correctly', () => {
      const { queryByText, rerender } = render(
        <FindContractorsButton {...defaultProps} visible={true} />
      );
      expect(queryByText('Find Contractors')).toBeTruthy();

      rerender(<FindContractorsButton {...defaultProps} visible={false} />);
      expect(queryByText('Find Contractors')).toBeNull();

      rerender(<FindContractorsButton {...defaultProps} visible={true} />);
      expect(queryByText('Find Contractors')).toBeTruthy();
    });

    it('should return null early when not visible', () => {
      const { toJSON } = render(
        <FindContractorsButton {...defaultProps} visible={false} />
      );
      expect(toJSON()).toBeNull();
    });
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  describe('Main Button Interactions', () => {
    it('should call onPress when main button is pressed', () => {
      const onPress = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onPress={onPress} />
      );

      const mainButton = screen.getByLabelText('Find contractors');
      fireEvent.press(mainButton);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should call onPress multiple times on multiple presses', () => {
      const onPress = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onPress={onPress} />
      );

      const mainButton = screen.getByLabelText('Find contractors');
      fireEvent.press(mainButton);
      fireEvent.press(mainButton);
      fireEvent.press(mainButton);

      expect(onPress).toHaveBeenCalledTimes(3);
    });

    it('should not call onDismiss when main button is pressed', () => {
      const onDismiss = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onDismiss={onDismiss} />
      );

      const mainButton = screen.getByLabelText('Find contractors');
      fireEvent.press(mainButton);

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('should handle rapid presses on main button', () => {
      const onPress = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onPress={onPress} />
      );

      const mainButton = screen.getByLabelText('Find contractors');

      for (let i = 0; i < 10; i++) {
        fireEvent.press(mainButton);
      }

      expect(onPress).toHaveBeenCalledTimes(10);
    });
  });

  describe('Dismiss Button Interactions', () => {
    it('should call onDismiss when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByLabelText('Dismiss');
      fireEvent.press(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss multiple times on multiple presses', () => {
      const onDismiss = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByLabelText('Dismiss');
      fireEvent.press(dismissButton);
      fireEvent.press(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(2);
    });

    it('should not call onPress when dismiss button is pressed', () => {
      const onPress = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onPress={onPress} />
      );

      const dismissButton = screen.getByLabelText('Dismiss');
      fireEvent.press(dismissButton);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('should handle rapid presses on dismiss button', () => {
      const onDismiss = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByLabelText('Dismiss');

      for (let i = 0; i < 5; i++) {
        fireEvent.press(dismissButton);
      }

      expect(onDismiss).toHaveBeenCalledTimes(5);
    });
  });

  describe('Combined Interactions', () => {
    it('should handle both buttons being pressed independently', () => {
      const onPress = jest.fn();
      const onDismiss = jest.fn();
      render(
        <FindContractorsButton
          {...defaultProps}
          onPress={onPress}
          onDismiss={onDismiss}
        />
      );

      const mainButton = screen.getByLabelText('Find contractors');
      const dismissButton = screen.getByLabelText('Dismiss');

      fireEvent.press(mainButton);
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledTimes(0);

      fireEvent.press(dismissButton);
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should handle alternating button presses', () => {
      const onPress = jest.fn();
      const onDismiss = jest.fn();
      render(
        <FindContractorsButton
          {...defaultProps}
          onPress={onPress}
          onDismiss={onDismiss}
        />
      );

      const mainButton = screen.getByLabelText('Find contractors');
      const dismissButton = screen.getByLabelText('Dismiss');

      fireEvent.press(mainButton);
      fireEvent.press(dismissButton);
      fireEvent.press(mainButton);
      fireEvent.press(dismissButton);

      expect(onPress).toHaveBeenCalledTimes(2);
      expect(onDismiss).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // HAPTIC FEEDBACK TESTS
  // ============================================================================

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on main button press', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const mainButton = screen.getByLabelText('Find contractors');

      fireEvent.press(mainButton);

      expect(mockButtonPress).toHaveBeenCalled();
    });

    it('should trigger haptic feedback on dismiss button press', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const dismissButton = screen.getByLabelText('Dismiss');

      fireEvent.press(dismissButton);

      expect(mockButtonPress).toHaveBeenCalled();
    });

    it('should call haptic feedback before onPress callback', () => {
      const callOrder: string[] = [];

      mockButtonPress.mockImplementation(() => callOrder.push('haptic'));
      const onPress = jest.fn(() => callOrder.push('callback'));

      render(
        <FindContractorsButton {...defaultProps} onPress={onPress} />
      );
      const mainButton = screen.getByLabelText('Find contractors');

      fireEvent.press(mainButton);

      expect(callOrder).toEqual(['haptic', 'callback']);
    });

    it('should call haptic feedback before onDismiss callback', () => {
      const callOrder: string[] = [];

      mockButtonPress.mockImplementation(() => callOrder.push('haptic'));
      const onDismiss = jest.fn(() => callOrder.push('callback'));

      render(
        <FindContractorsButton {...defaultProps} onDismiss={onDismiss} />
      );
      const dismissButton = screen.getByLabelText('Dismiss');

      fireEvent.press(dismissButton);

      expect(callOrder).toEqual(['haptic', 'callback']);
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility', () => {
    it('should have correct accessibility role for main button', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const mainButton = screen.getByLabelText('Find contractors');
      expect(mainButton.props.accessibilityRole).toBe('button');
    });

    it('should have correct accessibility role for dismiss button', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const dismissButton = screen.getByLabelText('Dismiss');
      expect(dismissButton.props.accessibilityRole).toBe('button');
    });

    it('should have correct accessibility label for main button', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const mainButton = screen.getByLabelText('Find contractors');
      expect(mainButton).toBeTruthy();
    });

    it('should have correct accessibility label for dismiss button', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const dismissButton = screen.getByLabelText('Dismiss');
      expect(dismissButton).toBeTruthy();
    });

    it('should be accessible by label for main button', () => {
      render(<FindContractorsButton {...defaultProps} />);
      expect(() => screen.getByLabelText('Find contractors')).not.toThrow();
    });

    it('should be accessible by label for dismiss button', () => {
      render(<FindContractorsButton {...defaultProps} />);
      expect(() => screen.getByLabelText('Dismiss')).not.toThrow();
    });

    it('should have TouchableOpacity components that are touchable', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const mainButton = screen.getByLabelText('Find contractors');
      const dismissButton = screen.getByLabelText('Dismiss');

      expect(mainButton.props.onPress).toBeDefined();
      expect(dismissButton.props.onPress).toBeDefined();
    });
  });

  // ============================================================================
  // PROPS VALIDATION TESTS
  // ============================================================================

  describe('Props Validation', () => {
    it('should handle visible prop as true', () => {
      const { getByText } = render(
        <FindContractorsButton {...defaultProps} visible={true} />
      );
      expect(getByText('Find Contractors')).toBeTruthy();
    });

    it('should handle visible prop as false', () => {
      const { queryByText } = render(
        <FindContractorsButton {...defaultProps} visible={false} />
      );
      expect(queryByText('Find Contractors')).toBeNull();
    });

    it('should handle onPress as function', () => {
      const onPress = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onPress={onPress} />
      );

      fireEvent.press(screen.getByLabelText('Find contractors'));
      expect(typeof onPress).toBe('function');
      expect(onPress).toHaveBeenCalled();
    });

    it('should handle onDismiss as function', () => {
      const onDismiss = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onDismiss={onDismiss} />
      );

      fireEvent.press(screen.getByLabelText('Dismiss'));
      expect(typeof onDismiss).toBe('function');
      expect(onDismiss).toHaveBeenCalled();
    });

    it('should accept all required props', () => {
      const props = {
        visible: true,
        onPress: jest.fn(),
        onDismiss: jest.fn(),
      };

      expect(() => render(<FindContractorsButton {...props} />)).not.toThrow();
    });
  });

  // ============================================================================
  // COMPONENT STRUCTURE TESTS
  // ============================================================================

  describe('Component Structure', () => {
    it('should render container view when visible', () => {
      const { getByText } = render(<FindContractorsButton {...defaultProps} />);
      const buttonText = getByText('Find Contractors');
      expect(buttonText.parent).toBeTruthy();
    });

    it('should render both buttons in the same container', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const mainButton = screen.getByLabelText('Find contractors');
      const dismissButton = screen.getByLabelText('Dismiss');

      expect(mainButton).toBeTruthy();
      expect(dismissButton).toBeTruthy();
    });

    it('should render text inside main button', () => {
      const { getByText } = render(<FindContractorsButton {...defaultProps} />);
      expect(getByText('Find Contractors')).toBeTruthy();
    });

    it('should render icon components', () => {
      const { UNSAFE_getAllByType } = render(<FindContractorsButton {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // EDGE CASES TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle callback with no return value', () => {
      const onPress = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onPress={onPress} />
      );

      expect(() => fireEvent.press(screen.getByLabelText('Find contractors'))).not.toThrow();
    });

    it('should handle callback that throws error gracefully', () => {
      const onPress = jest.fn(() => {
        throw new Error('Test error');
      });

      render(
        <FindContractorsButton {...defaultProps} onPress={onPress} />
      );

      expect(() => fireEvent.press(screen.getByLabelText('Find contractors'))).toThrow();
    });

    it('should handle visibility toggle during interaction', () => {
      const { rerender, queryByText } = render(
        <FindContractorsButton {...defaultProps} visible={true} />
      );

      expect(screen.getByLabelText('Find contractors')).toBeTruthy();

      rerender(<FindContractorsButton {...defaultProps} visible={false} />);
      expect(queryByText('Find Contractors')).toBeNull();
    });

    it('should handle prop updates', () => {
      const onPress1 = jest.fn();
      const onPress2 = jest.fn();

      const { rerender } = render(
        <FindContractorsButton {...defaultProps} onPress={onPress1} />
      );

      fireEvent.press(screen.getByLabelText('Find contractors'));
      expect(onPress1).toHaveBeenCalledTimes(1);
      expect(onPress2).toHaveBeenCalledTimes(0);

      rerender(
        <FindContractorsButton {...defaultProps} onPress={onPress2} />
      );

      fireEvent.press(screen.getByLabelText('Find contractors'));
      expect(onPress1).toHaveBeenCalledTimes(1);
      expect(onPress2).toHaveBeenCalledTimes(1);
    });

    it('should maintain state across re-renders when visible remains true', () => {
      const { getByText, rerender } = render(
        <FindContractorsButton {...defaultProps} visible={true} />
      );

      expect(getByText('Find Contractors')).toBeTruthy();

      rerender(<FindContractorsButton {...defaultProps} visible={true} />);
      expect(getByText('Find Contractors')).toBeTruthy();
    });
  });

  // ============================================================================
  // STYLING TESTS
  // ============================================================================

  describe('Styling', () => {
    it('should apply container styles', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const mainButton = screen.getByLabelText('Find contractors');
      expect(mainButton.parent?.props.style).toBeDefined();
    });

    it('should apply button styles to main button', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const mainButton = screen.getByLabelText('Find contractors');
      expect(mainButton.props.style).toBeDefined();
    });

    it('should apply button styles to dismiss button', () => {
      render(<FindContractorsButton {...defaultProps} />);
      const dismissButton = screen.getByLabelText('Dismiss');
      expect(dismissButton.props.style).toBeDefined();
    });

    it('should apply text styles', () => {
      const { getByText } = render(<FindContractorsButton {...defaultProps} />);
      const buttonText = getByText('Find Contractors');
      expect(buttonText.props.style).toBeDefined();
    });
  });

  // ============================================================================
  // ICON TESTS
  // ============================================================================

  describe('Icon Configuration', () => {
    it('should render search icon with correct name', () => {
      const { UNSAFE_getAllByType } = render(<FindContractorsButton {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons');
      const searchIcon = icons.find(icon => icon.props.name === 'search');
      expect(searchIcon).toBeTruthy();
    });

    it('should render close icon with correct name', () => {
      const { UNSAFE_getAllByType } = render(<FindContractorsButton {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons');
      const closeIcon = icons.find(icon => icon.props.name === 'close');
      expect(closeIcon).toBeTruthy();
    });

    it('should render search icon with correct size', () => {
      const { UNSAFE_getAllByType } = render(<FindContractorsButton {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons');
      const searchIcon = icons.find(icon => icon.props.name === 'search');
      expect(searchIcon?.props.size).toBe(20);
    });

    it('should render close icon with correct size', () => {
      const { UNSAFE_getAllByType } = render(<FindContractorsButton {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons');
      const closeIcon = icons.find(icon => icon.props.name === 'close');
      expect(closeIcon?.props.size).toBe(16);
    });

    it('should render search icon with correct color', () => {
      const { UNSAFE_getAllByType } = render(<FindContractorsButton {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons');
      const searchIcon = icons.find(icon => icon.props.name === 'search');
      expect(searchIcon?.props.color).toBeDefined();
    });

    it('should render close icon with correct color', () => {
      const { UNSAFE_getAllByType } = render(<FindContractorsButton {...defaultProps} />);
      const icons = UNSAFE_getAllByType('Ionicons');
      const closeIcon = icons.find(icon => icon.props.name === 'close');
      expect(closeIcon?.props.color).toBeDefined();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration', () => {
    it('should work correctly in complete user flow', () => {
      const onPress = jest.fn();
      const onDismiss = jest.fn();

      render(
        <FindContractorsButton
          visible={true}
          onPress={onPress}
          onDismiss={onDismiss}
        />
      );

      // User taps main button
      fireEvent.press(screen.getByLabelText('Find contractors'));
      expect(onPress).toHaveBeenCalledTimes(1);

      // User dismisses the button
      fireEvent.press(screen.getByLabelText('Dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple user interactions in sequence', () => {
      const onPress = jest.fn();
      const onDismiss = jest.fn();

      render(
        <FindContractorsButton
          visible={true}
          onPress={onPress}
          onDismiss={onDismiss}
        />
      );

      const mainButton = screen.getByLabelText('Find contractors');
      const dismissButton = screen.getByLabelText('Dismiss');

      fireEvent.press(mainButton);
      fireEvent.press(mainButton);
      fireEvent.press(dismissButton);
      fireEvent.press(mainButton);

      expect(onPress).toHaveBeenCalledTimes(3);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should maintain correct behavior after show/hide cycles', () => {
      const onPress = jest.fn();
      const { rerender, queryByText } = render(
        <FindContractorsButton {...defaultProps} visible={true} onPress={onPress} />
      );

      // First interaction
      fireEvent.press(screen.getByLabelText('Find contractors'));
      expect(onPress).toHaveBeenCalledTimes(1);

      // Hide
      rerender(
        <FindContractorsButton {...defaultProps} visible={false} onPress={onPress} />
      );
      expect(queryByText('Find Contractors')).toBeNull();

      // Show again
      rerender(
        <FindContractorsButton {...defaultProps} visible={true} onPress={onPress} />
      );

      // Second interaction
      fireEvent.press(screen.getByLabelText('Find contractors'));
      expect(onPress).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    it('should handle rapid visibility toggles', () => {
      const { rerender, queryByText } = render(
        <FindContractorsButton {...defaultProps} visible={true} />
      );

      for (let i = 0; i < 20; i++) {
        rerender(
          <FindContractorsButton {...defaultProps} visible={i % 2 === 0} />
        );
      }

      // After 20 iterations (0-19), last iteration is i=19 which is odd, so visible=false
      // Let's verify the final state matches the last render
      expect(queryByText('Find Contractors')).toBeNull();
    });

    it('should handle many sequential presses efficiently', () => {
      const onPress = jest.fn();
      render(
        <FindContractorsButton {...defaultProps} onPress={onPress} />
      );

      const mainButton = screen.getByLabelText('Find contractors');

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        fireEvent.press(mainButton);
      }
      const endTime = Date.now();

      expect(onPress).toHaveBeenCalledTimes(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });
  });

  // ============================================================================
  // SNAPSHOT TESTS
  // ============================================================================

  describe('Snapshots', () => {
    it('should match snapshot when visible', () => {
      const { toJSON } = render(<FindContractorsButton {...defaultProps} visible={true} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot when not visible', () => {
      const { toJSON } = render(<FindContractorsButton {...defaultProps} visible={false} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

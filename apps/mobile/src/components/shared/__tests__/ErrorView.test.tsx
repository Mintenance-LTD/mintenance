/**
 * ErrorView Component Tests
 *
 * Comprehensive test suite for the ErrorView component
 * Target: 100% code coverage
 *
 * @component ErrorView
 * @filesize 300+ lines
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorView } from '../ErrorView';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, style, testID, ...props }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return (
      <Text
        testID={testID || `icon-${name}`}
        style={style}
        accessibilityLabel={`Icon: ${name}, size: ${size}, color: ${color}`}
        {...props}
      >
        {name}
      </Text>
    );
  },
  glyphMap: {
    'alert-circle-outline': 'alert-circle-outline',
    'warning-outline': 'warning-outline',
    'close-circle-outline': 'close-circle-outline',
    'alert': 'alert',
  },
}));

jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      error: '#EF4444',
      background: '#FFFFFF',
      textPrimary: '#171717',
      primary: '#0EA5E9',
      white: '#FFFFFF',
    },
    spacing: {
      xl: 24,
      lg: 16,
      md: 12,
    },
    typography: {
      fontSize: {
        lg: 18,
        base: 16,
      },
      fontWeight: {
        semibold: '600',
      },
    },
    borderRadius: {
      lg: 12,
    },
  },
}));

// ============================================================================
// ERROR VIEW COMPONENT TESTS
// ============================================================================

describe('ErrorView Component', () => {
  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders error message text', () => {
      const { getByText } = render(
        <ErrorView message="Something went wrong" />
      );
      expect(getByText('Something went wrong')).toBeTruthy();
    });

    it('renders Ionicons with correct name', () => {
      const { getByTestId } = render(
        <ErrorView message="Error" />
      );
      expect(getByTestId('icon-alert-circle-outline')).toBeTruthy();
    });

    it('renders Ionicons with error color', () => {
      const { getByTestId } = render(
        <ErrorView message="Error" />
      );
      const icon = getByTestId('icon-alert-circle-outline');
      expect(icon.props.accessibilityLabel).toContain('color: #EF4444');
    });

    it('renders Ionicons with size 64', () => {
      const { getByTestId } = render(
        <ErrorView message="Error" />
      );
      const icon = getByTestId('icon-alert-circle-outline');
      expect(icon.props.accessibilityLabel).toContain('size: 64');
    });

    it('renders container View', () => {
      const { getByText } = render(
        <ErrorView message="Test" />
      );
      const message = getByText('Test');
      expect(message.parent).toBeTruthy();
    });

    it('message has correct text alignment and max width', () => {
      const { getByText } = render(
        <ErrorView message="Error message" />
      );
      const messageText = getByText('Error message');
      const styles = Array.isArray(messageText.props.style)
        ? messageText.props.style.flat()
        : [messageText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            textAlign: 'center',
            maxWidth: 300,
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // fullScreen Prop Tests
  // --------------------------------------------------------------------------

  describe('fullScreen Prop', () => {
    it('applies fullScreen style when fullScreen is true (default)', () => {
      const { getByText } = render(
        <ErrorView message="Error" />
      );
      const container = getByText('Error').parent;
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flex: 1,
            backgroundColor: '#FFFFFF',
          }),
        ])
      );
    });

    it('applies fullScreen style when fullScreen is explicitly true', () => {
      const { getByText } = render(
        <ErrorView message="Error" fullScreen={true} />
      );
      const container = getByText('Error').parent;
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flex: 1,
            backgroundColor: '#FFFFFF',
          }),
        ])
      );
    });

    it('does not apply fullScreen style when fullScreen is false', () => {
      const { getByText } = render(
        <ErrorView message="Error" fullScreen={false} />
      );
      const container = getByText('Error').parent;
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      const hasFullScreenStyle = styles.some((style: any) =>
        style?.flex === 1 || style?.backgroundColor === '#FFFFFF'
      );
      expect(hasFullScreenStyle).toBe(false);
    });

    it('fullScreen style includes flex: 1 and background color', () => {
      const { getByText } = render(
        <ErrorView message="Error" fullScreen={true} />
      );
      const container = getByText('Error').parent;
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flex: 1,
          }),
        ])
      );

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#FFFFFF',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Retry Button Tests
  // --------------------------------------------------------------------------

  describe('Retry Button', () => {
    it('shows retry button when onRetry is provided', () => {
      const { getByText } = render(
        <ErrorView message="Error" onRetry={() => {}} />
      );
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('hides retry button when onRetry is undefined', () => {
      const { queryByText } = render(
        <ErrorView message="Error" />
      );
      expect(queryByText('Try Again')).toBeNull();
    });

    it('retry button displays "Try Again" text', () => {
      const { getByText } = render(
        <ErrorView message="Error" onRetry={() => {}} />
      );
      const button = getByText('Try Again');
      expect(button).toBeTruthy();
    });

    it('calls onRetry when button pressed', () => {
      const onRetry = jest.fn();
      const { getByText } = render(
        <ErrorView message="Error" onRetry={onRetry} />
      );

      fireEvent.press(getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('can call onRetry multiple times', () => {
      const onRetry = jest.fn();
      const { getByText } = render(
        <ErrorView message="Error" onRetry={onRetry} />
      );

      const button = getByText('Try Again');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(onRetry).toHaveBeenCalledTimes(3);
    });

    it('retry button has primary background color', () => {
      const { getByText } = render(
        <ErrorView message="Error" onRetry={() => {}} />
      );
      const button = getByText('Try Again').parent;
      const styles = Array.isArray(button?.props.style)
        ? button.props.style.flat()
        : [button?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Icon Customization Tests
  // --------------------------------------------------------------------------

  describe('Icon Customization', () => {
    it('uses default icon "alert-circle-outline" when icon prop not provided', () => {
      const { getByTestId } = render(
        <ErrorView message="Error" />
      );
      expect(getByTestId('icon-alert-circle-outline')).toBeTruthy();
    });

    it('uses custom icon when icon prop provided ("warning-outline")', () => {
      const { getByTestId } = render(
        <ErrorView message="Error" icon="warning-outline" />
      );
      expect(getByTestId('icon-warning-outline')).toBeTruthy();
    });

    it('uses custom icon when icon prop provided ("close-circle-outline")', () => {
      const { getByTestId } = render(
        <ErrorView message="Error" icon="close-circle-outline" />
      );
      expect(getByTestId('icon-close-circle-outline')).toBeTruthy();
    });

    it('icon color is always theme.colors.error', () => {
      const { getByTestId } = render(
        <ErrorView message="Error" icon="warning-outline" />
      );
      const icon = getByTestId('icon-warning-outline');
      expect(icon.props.accessibilityLabel).toContain('color: #EF4444');
    });

    it('icon color is always theme.colors.error regardless of icon type', () => {
      const { getByTestId } = render(
        <ErrorView message="Error" icon="alert" />
      );
      const icon = getByTestId('icon-alert');
      expect(icon.props.accessibilityLabel).toContain('color: #EF4444');
    });
  });

  // --------------------------------------------------------------------------
  // Props Validation Tests
  // --------------------------------------------------------------------------

  describe('Props Validation', () => {
    it('renders with only required message prop', () => {
      const { getByText } = render(
        <ErrorView message="Minimum props" />
      );
      expect(getByText('Minimum props')).toBeTruthy();
    });

    it('renders with all props provided', () => {
      const onRetry = jest.fn();
      const { getByText, getByTestId } = render(
        <ErrorView
          message="All props"
          onRetry={onRetry}
          fullScreen={false}
          icon="warning-outline"
        />
      );

      expect(getByText('All props')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
      expect(getByTestId('icon-warning-outline')).toBeTruthy();
    });

    it('message prop is displayed correctly', () => {
      const testMessage = 'This is a test error message';
      const { getByText } = render(
        <ErrorView message={testMessage} />
      );
      expect(getByText(testMessage)).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles very long error messages', () => {
      const longMessage = 'This is a very long error message that contains multiple sentences and should still be displayed correctly even though it exceeds normal length expectations and might cause layout issues if not handled properly.';
      const { getByText } = render(
        <ErrorView message={longMessage} />
      );
      expect(getByText(longMessage)).toBeTruthy();
    });

    it('handles empty string message', () => {
      const { getByText } = render(
        <ErrorView message="" />
      );
      expect(getByText('')).toBeTruthy();
    });

    it('handles onRetry being called multiple times', () => {
      const onRetry = jest.fn();
      const { getByText } = render(
        <ErrorView message="Error" onRetry={onRetry} />
      );

      const button = getByText('Try Again');
      for (let i = 0; i < 5; i++) {
        fireEvent.press(button);
      }

      expect(onRetry).toHaveBeenCalledTimes(5);
    });

    it('handles special characters in message', () => {
      const specialMessage = 'Error: <>&"\'{}[]';
      const { getByText } = render(
        <ErrorView message={specialMessage} />
      );
      expect(getByText(specialMessage)).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('renders complete error view with retry button (fullScreen=true)', () => {
      const onRetry = jest.fn();
      const { getByText, getByTestId } = render(
        <ErrorView
          message="Network error occurred"
          onRetry={onRetry}
          fullScreen={true}
          icon="alert-circle-outline"
        />
      );

      // Verify all elements present
      expect(getByText('Network error occurred')).toBeTruthy();
      expect(getByTestId('icon-alert-circle-outline')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();

      // Verify fullScreen style
      const container = getByText('Network error occurred').parent;
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flex: 1,
          }),
        ])
      );

      // Verify button works
      fireEvent.press(getByText('Try Again'));
      expect(onRetry).toHaveBeenCalled();
    });

    it('renders complete error view without retry button (fullScreen=false)', () => {
      const { getByText, getByTestId, queryByText } = render(
        <ErrorView
          message="Error loading data"
          fullScreen={false}
          icon="warning-outline"
        />
      );

      // Verify elements
      expect(getByText('Error loading data')).toBeTruthy();
      expect(getByTestId('icon-warning-outline')).toBeTruthy();
      expect(queryByText('Try Again')).toBeNull();

      // Verify no fullScreen style
      const container = getByText('Error loading data').parent;
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];
      const hasFullScreenStyle = styles.some((style: any) =>
        style?.flex === 1
      );
      expect(hasFullScreenStyle).toBe(false);
    });

    it('renders with custom icon and retry handler', () => {
      const onRetry = jest.fn();
      const { getByText, getByTestId } = render(
        <ErrorView
          message="Custom error"
          icon="close-circle-outline"
          onRetry={onRetry}
        />
      );

      expect(getByText('Custom error')).toBeTruthy();
      expect(getByTestId('icon-close-circle-outline')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();

      fireEvent.press(getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('multiple retry button presses work correctly', () => {
      const onRetry = jest.fn();
      const { getByText } = render(
        <ErrorView
          message="Retry test"
          onRetry={onRetry}
        />
      );

      const button = getByText('Try Again');

      // Press multiple times
      fireEvent.press(button);
      expect(onRetry).toHaveBeenCalledTimes(1);

      fireEvent.press(button);
      expect(onRetry).toHaveBeenCalledTimes(2);

      fireEvent.press(button);
      expect(onRetry).toHaveBeenCalledTimes(3);
    });
  });

  // --------------------------------------------------------------------------
  // Styling Verification Tests
  // --------------------------------------------------------------------------

  describe('Styling Verification', () => {
    it('applies correct container styles', () => {
      const { getByText } = render(
        <ErrorView message="Test" />
      );
      const container = getByText('Test').parent;
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }),
        ])
      );
    });

    it('applies correct message text styles', () => {
      const { getByText } = render(
        <ErrorView message="Style test" />
      );
      const message = getByText('Style test');
      const styles = Array.isArray(message.props.style)
        ? message.props.style.flat()
        : [message.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginTop: 16,
            fontSize: 18,
            color: '#171717',
            textAlign: 'center',
            maxWidth: 300,
          }),
        ])
      );
    });

    it('applies correct retry button styles', () => {
      const { getByText } = render(
        <ErrorView message="Test" onRetry={() => {}} />
      );
      const button = getByText('Try Again').parent;
      const styles = Array.isArray(button?.props.style)
        ? button.props.style.flat()
        : [button?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginTop: 24,
            backgroundColor: '#0EA5E9',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }),
        ])
      );
    });

    it('applies correct retry button text styles', () => {
      const { getByText } = render(
        <ErrorView message="Test" onRetry={() => {}} />
      );
      const buttonText = getByText('Try Again');
      const styles = Array.isArray(buttonText.props.style)
        ? buttonText.props.style.flat()
        : [buttonText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 16,
            fontWeight: '600',
            color: '#FFFFFF',
          }),
        ])
      );
    });
  });
});

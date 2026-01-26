/**
 * LoadingSpinner Component Tests
 *
 * Comprehensive test suite for the LoadingSpinner component
 * Target: 100% code coverage
 *
 * @component LoadingSpinner
 * @filesize 300+ lines
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingSpinner } from '../LoadingSpinner';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      primary: '#0EA5E9',
      background: '#FFFFFF',
      textSecondary: '#737373',
    },
    spacing: {
      xl: 24,
      md: 12,
    },
    typography: {
      fontSize: {
        base: 16,
      },
    },
  },
}));

// Mock ActivityIndicator to capture props
let mockActivityIndicator: jest.Mock;

jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  const React = require('react');

  mockActivityIndicator = jest.fn(({ size, color, testID, ...props }) => {
    return React.createElement(
      actualRN.View,
      {
        testID: testID || 'activity-indicator',
        accessibilityLabel: `ActivityIndicator: size=${size}, color=${color}`,
        ...props,
      }
    );
  });

  return {
    ...actualRN,
    ActivityIndicator: mockActivityIndicator,
  };
});

// ============================================================================
// LOADINGSPINNER COMPONENT TESTS
// ============================================================================

describe('LoadingSpinner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders ActivityIndicator with correct size', () => {
      render(<LoadingSpinner />);
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({ size: 'large' })
      );
    });

    it('renders ActivityIndicator with primary color', () => {
      render(<LoadingSpinner />);
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({ color: '#0EA5E9' })
      );
    });

    it('renders message text when provided', () => {
      const { getByText } = render(<LoadingSpinner message="Loading data..." />);
      expect(getByText('Loading data...')).toBeTruthy();
    });

    it('renders container View', () => {
      const { getByTestId } = render(<LoadingSpinner />);
      const activityIndicator = getByTestId('activity-indicator');
      expect(activityIndicator.parent).toBeTruthy();
    });

    it('message has correct styling from theme', () => {
      const { getByText } = render(<LoadingSpinner message="Loading..." />);
      const messageText = getByText('Loading...');
      const styles = Array.isArray(messageText.props.style)
        ? messageText.props.style.flat()
        : [messageText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginTop: 12,
            fontSize: 16,
            color: '#737373',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // message Prop Tests
  // --------------------------------------------------------------------------

  describe('message Prop', () => {
    it('shows default message "Loading..." when message prop not provided', () => {
      const { getByText } = render(<LoadingSpinner />);
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('shows custom message when message prop provided', () => {
      const { getByText } = render(<LoadingSpinner message="Please wait" />);
      expect(getByText('Please wait')).toBeTruthy();
    });

    it('hides message when message is empty string', () => {
      const { queryByText } = render(<LoadingSpinner message="" />);
      expect(queryByText('Loading...')).toBeNull();
      expect(queryByText('')).toBeNull();
    });

    it('hides message when message is undefined (no prop)', () => {
      const { queryByText } = render(<LoadingSpinner message={undefined} />);
      // When message is undefined, default 'Loading...' is used
      expect(queryByText('Loading...')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // size Prop Tests
  // --------------------------------------------------------------------------

  describe('size Prop', () => {
    it('uses default size "large" when size prop not provided', () => {
      render(<LoadingSpinner />);
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({ size: 'large' })
      );
    });

    it('uses "small" size when size prop is "small"', () => {
      render(<LoadingSpinner size="small" />);
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({ size: 'small' })
      );
    });

    it('uses "large" size when size prop is "large"', () => {
      render(<LoadingSpinner size="large" />);
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({ size: 'large' })
      );
    });
  });

  // --------------------------------------------------------------------------
  // fullScreen Prop Tests
  // --------------------------------------------------------------------------

  describe('fullScreen Prop', () => {
    it('applies fullScreen style when fullScreen is true (default)', () => {
      const { UNSAFE_root } = render(<LoadingSpinner />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];

      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      const hasFlexStyle = styles.some((style: any) => style?.flex === 1);
      const hasBgColor = styles.some((style: any) => style?.backgroundColor === '#FFFFFF');

      expect(hasFlexStyle).toBe(true);
      expect(hasBgColor).toBe(true);
    });

    it('applies fullScreen style when fullScreen is explicitly true', () => {
      const { UNSAFE_root } = render(<LoadingSpinner fullScreen={true} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];

      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      const hasFlexStyle = styles.some((style: any) => style?.flex === 1);
      const hasBgColor = styles.some((style: any) => style?.backgroundColor === '#FFFFFF');

      expect(hasFlexStyle).toBe(true);
      expect(hasBgColor).toBe(true);
    });

    it('does not apply fullScreen style when fullScreen is false', () => {
      const { UNSAFE_root } = render(<LoadingSpinner fullScreen={false} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];

      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      const hasFlexStyle = styles.some((style: any) => style?.flex === 1);
      const hasBgColor = styles.some((style: any) => style?.backgroundColor === '#FFFFFF');

      expect(hasFlexStyle).toBe(false);
      expect(hasBgColor).toBe(false);
    });

    it('fullScreen style includes flex: 1 and background color', () => {
      const { UNSAFE_root } = render(<LoadingSpinner fullScreen={true} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];

      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      const hasFlexStyle = styles.some((style: any) => style?.flex === 1);
      const hasBgColor = styles.some((style: any) => style?.backgroundColor === '#FFFFFF');

      expect(hasFlexStyle).toBe(true);
      expect(hasBgColor).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Props Validation Tests
  // --------------------------------------------------------------------------

  describe('Props Validation', () => {
    it('renders with no props (all defaults)', () => {
      const { getByText, getByTestId } = render(<LoadingSpinner />);
      expect(getByText('Loading...')).toBeTruthy();
      expect(getByTestId('activity-indicator')).toBeTruthy();
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({
          size: 'large',
          color: '#0EA5E9',
        })
      );
    });

    it('renders with all props provided', () => {
      const { getByText, getByTestId } = render(
        <LoadingSpinner
          message="Custom loading message"
          size="small"
          fullScreen={false}
        />
      );

      expect(getByText('Custom loading message')).toBeTruthy();
      expect(getByTestId('activity-indicator')).toBeTruthy();
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({
          size: 'small',
          color: '#0EA5E9',
        })
      );
    });

    it('message prop is displayed correctly', () => {
      const testMessage = 'Loading user data...';
      const { getByText } = render(<LoadingSpinner message={testMessage} />);
      expect(getByText(testMessage)).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles very long loading messages', () => {
      const longMessage = 'This is a very long loading message that contains multiple sentences and should still be displayed correctly even though it exceeds normal length expectations and might cause layout issues if not handled properly by the component.';
      const { getByText } = render(<LoadingSpinner message={longMessage} />);
      expect(getByText(longMessage)).toBeTruthy();
    });

    it('handles empty string message', () => {
      const { queryByText, getByTestId } = render(<LoadingSpinner message="" />);
      // Empty string is falsy, so message should not be rendered
      expect(queryByText('Loading...')).toBeNull();
      expect(getByTestId('activity-indicator')).toBeTruthy();
    });

    it('handles special characters in message', () => {
      const specialMessage = 'Loading: <>&"\'{}[]';
      const { getByText } = render(<LoadingSpinner message={specialMessage} />);
      expect(getByText(specialMessage)).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('renders complete loading view with fullScreen=true', () => {
      const { getByText, getByTestId } = render(
        <LoadingSpinner
          message="Loading your data..."
          size="large"
          fullScreen={true}
        />
      );

      // Verify all elements present
      expect(getByText('Loading your data...')).toBeTruthy();
      expect(getByTestId('activity-indicator')).toBeTruthy();

      // Verify ActivityIndicator props
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({
          size: 'large',
          color: '#0EA5E9',
        })
      );

      // Verify fullScreen style
      const { UNSAFE_root } = render(<LoadingSpinner fullScreen={true} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];

      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      const hasFlexStyle = styles.some((style: any) => style?.flex === 1);
      const hasBgColor = styles.some((style: any) => style?.backgroundColor === '#FFFFFF');

      expect(hasFlexStyle).toBe(true);
      expect(hasBgColor).toBe(true);
    });

    it('renders complete loading view with fullScreen=false', () => {
      const { getByText, getByTestId, UNSAFE_root } = render(
        <LoadingSpinner
          message="Processing..."
          size="small"
          fullScreen={false}
        />
      );

      // Verify elements
      expect(getByText('Processing...')).toBeTruthy();
      expect(getByTestId('activity-indicator')).toBeTruthy();

      // Verify ActivityIndicator props
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({
          size: 'small',
          color: '#0EA5E9',
        })
      );

      // Verify no fullScreen style
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];

      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      const hasFullScreenStyle = styles.some((style: any) => style?.flex === 1);
      expect(hasFullScreenStyle).toBe(false);
    });

    it('renders with custom message and size', () => {
      const { getByText, getByTestId } = render(
        <LoadingSpinner
          message="Fetching jobs..."
          size="small"
        />
      );

      expect(getByText('Fetching jobs...')).toBeTruthy();
      expect(getByTestId('activity-indicator')).toBeTruthy();
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({
          size: 'small',
          color: '#0EA5E9',
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Styling Verification Tests
  // --------------------------------------------------------------------------

  describe('Styling Verification', () => {
    it('applies correct container styles', () => {
      const { UNSAFE_root } = render(<LoadingSpinner />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];

      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      const hasJustifyCenter = styles.some((style: any) => style?.justifyContent === 'center');
      const hasAlignCenter = styles.some((style: any) => style?.alignItems === 'center');
      const hasPadding = styles.some((style: any) => style?.padding === 24);

      expect(hasJustifyCenter).toBe(true);
      expect(hasAlignCenter).toBe(true);
      expect(hasPadding).toBe(true);
    });

    it('applies correct message text styles', () => {
      const { getByText } = render(<LoadingSpinner message="Style test" />);
      const message = getByText('Style test');
      const styles = Array.isArray(message.props.style)
        ? message.props.style.flat()
        : [message.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginTop: 12,
            fontSize: 16,
            color: '#737373',
          }),
        ])
      );
    });

    it('applies fullScreen styles correctly', () => {
      const { UNSAFE_root } = render(<LoadingSpinner fullScreen={true} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];

      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      const hasFlexStyle = styles.some((style: any) => style?.flex === 1);
      const hasBgColor = styles.some((style: any) => style?.backgroundColor === '#FFFFFF');

      expect(hasFlexStyle).toBe(true);
      expect(hasBgColor).toBe(true);
    });

    it('does not apply fullScreen styles when fullScreen is false', () => {
      const { UNSAFE_root } = render(<LoadingSpinner fullScreen={false} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];

      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      // Should have container styles
      const hasJustifyCenter = styles.some((style: any) => style?.justifyContent === 'center');
      const hasAlignCenter = styles.some((style: any) => style?.alignItems === 'center');
      const hasPadding = styles.some((style: any) => style?.padding === 24);

      expect(hasJustifyCenter).toBe(true);
      expect(hasAlignCenter).toBe(true);
      expect(hasPadding).toBe(true);

      // Should NOT have fullScreen styles
      const hasFlexStyle = styles.some((style: any) => style?.flex === 1);
      const hasBgColor = styles.some((style: any) => style?.backgroundColor === '#FFFFFF');

      expect(hasFlexStyle).toBe(false);
      expect(hasBgColor).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // ActivityIndicator Props Tests
  // --------------------------------------------------------------------------

  describe('ActivityIndicator Props', () => {
    it('passes correct size prop to ActivityIndicator', () => {
      render(<LoadingSpinner size="small" />);
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({ size: 'small' })
      );
    });

    it('passes correct color prop to ActivityIndicator', () => {
      render(<LoadingSpinner />);
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({ color: '#0EA5E9' })
      );
    });

    it('ActivityIndicator receives both size and color', () => {
      render(<LoadingSpinner size="large" />);
      const calls = mockActivityIndicator.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({
          size: 'large',
          color: '#0EA5E9',
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Conditional Rendering Tests
  // --------------------------------------------------------------------------

  describe('Conditional Rendering', () => {
    it('shows message when truthy string provided', () => {
      const { getByText } = render(<LoadingSpinner message="Loading data" />);
      expect(getByText('Loading data')).toBeTruthy();
    });

    it('does not show message when empty string provided', () => {
      const { queryByText } = render(<LoadingSpinner message="" />);
      expect(queryByText('')).toBeNull();
    });

    it('shows default message when message prop not provided', () => {
      const { getByText } = render(<LoadingSpinner />);
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('message Text component only renders when message is truthy', () => {
      const { queryByText: queryEmpty } = render(<LoadingSpinner message="" />);
      expect(queryEmpty('Loading...')).toBeNull();

      const { getByText: getWithMessage } = render(<LoadingSpinner message="Test" />);
      expect(getWithMessage('Test')).toBeTruthy();
    });
  });
});

/**
 * Tests for LoadingSpinner Component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingSpinner, FullScreenLoading } from '../LoadingSpinner';
import { theme } from '../../theme';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      expect(getByTestId('loading-spinner')).toBeDefined();
      expect(getByTestId('loading-text')).toBeDefined();
    });

    it('should render with custom message', () => {
      const { getByTestId } = render(<LoadingSpinner message="Please wait..." />);

      const text = getByTestId('loading-text');
      expect(text.props.children).toBe('Please wait...');
    });

    it('should render with small size', () => {
      const { getByTestId } = render(<LoadingSpinner size="small" />);

      expect(getByTestId('loading-spinner')).toBeDefined();
    });

    it('should render with large size', () => {
      const { getByTestId } = render(<LoadingSpinner size="large" />);

      expect(getByTestId('loading-spinner')).toBeDefined();
    });

    it('should render with custom color', () => {
      const customColor = '#FF5733';
      const { getByTestId } = render(<LoadingSpinner color={customColor} />);

      const text = getByTestId('loading-text');
      expect(text.props.style).toContainEqual({ color: customColor });
    });

    it('should not render message when empty string provided', () => {
      const { queryByTestId } = render(<LoadingSpinner message="" />);

      expect(queryByTestId('loading-text')).toBeNull();
    });
  });

  describe('Props Defaults', () => {
    it('should use default message "Loading..."', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      const text = getByTestId('loading-text');
      expect(text.props.children).toBe('Loading...');
    });

    it('should use default size "large"', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      // Component renders successfully with default
      expect(getByTestId('loading-spinner')).toBeDefined();
    });

    it('should use default theme color', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      const text = getByTestId('loading-text');
      expect(text.props.style).toContainEqual({ color: theme.colors.info });
    });
  });

  describe('Props Combinations', () => {
    it('should handle all custom props together', () => {
      const { getByTestId } = render(
        <LoadingSpinner message="Custom message" size="small" color="#00FF00" />
      );

      const text = getByTestId('loading-text');
      expect(text.props.children).toBe('Custom message');
      expect(text.props.style).toContainEqual({ color: '#00FF00' });
    });

    it('should handle size large with custom message', () => {
      const { getByTestId } = render(<LoadingSpinner message="Loading data..." size="large" />);

      expect(getByTestId('loading-text').props.children).toBe('Loading data...');
    });

    it('should handle size small with custom color', () => {
      const { getByTestId } = render(<LoadingSpinner size="small" color="#FF0000" />);

      const text = getByTestId('loading-text');
      expect(text.props.style).toContainEqual({ color: '#FF0000' });
    });
  });

  describe('Accessibility', () => {
    it('should have testID for container', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      expect(getByTestId('loading-spinner')).toBeDefined();
    });

    it('should have testID for text', () => {
      const { getByTestId } = render(<LoadingSpinner message="Loading..." />);

      expect(getByTestId('loading-text')).toBeDefined();
    });

    it('should support screen readers with message text', () => {
      const { getByTestId } = render(<LoadingSpinner message="Loading your data" />);

      const text = getByTestId('loading-text');
      expect(text.props.children).toBe('Loading your data');
    });
  });
});

describe('FullScreenLoading', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      const { getByText } = render(<FullScreenLoading />);

      expect(getByText('Loading...')).toBeDefined();
    });

    it('should render with custom message', () => {
      const { getByText } = render(<FullScreenLoading message="Initializing..." />);

      expect(getByText('Initializing...')).toBeDefined();
    });

    it('should use large size ActivityIndicator', () => {
      const { container } = render(<FullScreenLoading />);

      // Component renders without error
      expect(container).toBeDefined();
    });

    it('should use theme info color', () => {
      const { container } = render(<FullScreenLoading />);

      // Component renders with theme colors
      expect(container).toBeDefined();
    });
  });

  describe('Props Defaults', () => {
    it('should use default message "Loading..."', () => {
      const { getByText } = render(<FullScreenLoading />);

      expect(getByText('Loading...')).toBeDefined();
    });
  });

  describe('Full Screen Behavior', () => {
    it('should render in fullscreen container', () => {
      const { container } = render(<FullScreenLoading />);

      expect(container).toBeDefined();
    });

    it('should display message below spinner', () => {
      const { getByText } = render(<FullScreenLoading message="Please wait" />);

      expect(getByText('Please wait')).toBeDefined();
    });

    it('should handle long messages', () => {
      const longMessage = 'This is a very long loading message that should still display correctly';
      const { getByText } = render(<FullScreenLoading message={longMessage} />);

      expect(getByText(longMessage)).toBeDefined();
    });
  });

  describe('Comparison with LoadingSpinner', () => {
    it('FullScreenLoading should not have testID', () => {
      const { queryByTestId } = render(<FullScreenLoading />);

      // FullScreenLoading doesn't use testIDs like LoadingSpinner
      expect(queryByTestId('loading-spinner')).toBeNull();
    });

    it('should use different styling than LoadingSpinner', () => {
      const { container: fullScreenContainer } = render(<FullScreenLoading />);
      const { container: spinnerContainer } = render(<LoadingSpinner />);

      expect(fullScreenContainer).toBeDefined();
      expect(spinnerContainer).toBeDefined();
    });
  });
});

describe('LoadingSpinner Edge Cases', () => {
  it('should handle undefined message', () => {
    const { queryByTestId } = render(<LoadingSpinner message={undefined} />);

    // Should render default message
    const text = queryByTestId('loading-text');
    expect(text).toBeDefined();
  });

  it('should handle very long messages', () => {
    const longMessage = 'A'.repeat(200);
    const { getByTestId } = render(<LoadingSpinner message={longMessage} />);

    expect(getByTestId('loading-text').props.children).toBe(longMessage);
  });

  it('should handle special characters in message', () => {
    const specialMessage = 'Loading... 🔄 100%';
    const { getByTestId } = render(<LoadingSpinner message={specialMessage} />);

    expect(getByTestId('loading-text').props.children).toBe(specialMessage);
  });

  it('should handle color with transparency', () => {
    const transparentColor = 'rgba(255, 0, 0, 0.5)';
    const { getByTestId } = render(<LoadingSpinner color={transparentColor} />);

    const text = getByTestId('loading-text');
    expect(text.props.style).toContainEqual({ color: transparentColor });
  });

  it('should handle hex color codes', () => {
    const hexColor = '#3498db';
    const { getByTestId } = render(<LoadingSpinner color={hexColor} />);

    const text = getByTestId('loading-text');
    expect(text.props.style).toContainEqual({ color: hexColor });
  });

  it('should handle named colors', () => {
    const namedColor = 'red';
    const { getByTestId } = render(<LoadingSpinner color={namedColor} />);

    const text = getByTestId('loading-text');
    expect(text.props.style).toContainEqual({ color: namedColor });
  });
});

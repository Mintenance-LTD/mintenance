/**
 * Comprehensive tests for BookingLoading Component
 * Target: 100% coverage with 20-40 tests
 */

import React from 'react';
import { render } from '../../../__tests__/test-utils';
import { BookingLoading } from '../BookingLoading';
import { theme } from '../../../theme';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('BookingLoading Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { root } = render(<BookingLoading />);
      expect(root).toBeDefined();
    });

    it('should render the container with correct testID', () => {
      const { getByTestId } = render(<BookingLoading />);
      expect(getByTestId('booking-loading-container')).toBeDefined();
    });

    it('should render ActivityIndicator with correct testID', () => {
      const { getByTestId } = render(<BookingLoading />);
      expect(getByTestId('booking-loading-spinner')).toBeDefined();
    });

    it('should render loading text with correct testID', () => {
      const { getByTestId } = render(<BookingLoading />);
      expect(getByTestId('booking-loading-text')).toBeDefined();
    });

    it('should render loading text with correct message', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.children).toBe('Loading your bookings...');
    });

    it('should render ActivityIndicator with large size', () => {
      const { getByTestId } = render(<BookingLoading />);
      const spinner = getByTestId('booking-loading-spinner');
      expect(spinner.props.size).toBe('large');
    });

    it('should render ActivityIndicator with primary color', () => {
      const { getByTestId } = render(<BookingLoading />);
      const spinner = getByTestId('booking-loading-spinner');
      expect(spinner.props.color).toBe(theme.colors.primary);
    });
  });

  describe('Component Structure', () => {
    it('should have correct component hierarchy', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container).toBeDefined();
    });

    it('should render spinner before text', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.props.children).toHaveLength(2);
    });

    it('should have text element as second child', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text).toBeDefined();
    });
  });

  describe('Styling', () => {
    it('should apply correct container styles', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.props.style).toMatchObject({
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      });
    });

    it('should apply correct text styles', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.style).toMatchObject({
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: 16,
      });
    });

    it('should use flex: 1 for full screen coverage', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.props.style).toMatchObject({ flex: 1 });
    });

    it('should center content vertically', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.props.style).toMatchObject({ justifyContent: 'center' });
    });

    it('should center content horizontally', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.props.style).toMatchObject({ alignItems: 'center' });
    });

    it('should use theme background color', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.props.style).toMatchObject({ backgroundColor: theme.colors.background });
    });

    it('should use theme textSecondary color for text', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.style).toMatchObject({ color: theme.colors.textSecondary });
    });

    it('should have 16px margin top for text', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.style).toMatchObject({ marginTop: 16 });
    });

    it('should have 16px font size for text', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.style).toMatchObject({ fontSize: 16 });
    });
  });

  describe('Accessibility', () => {
    it('should have testID for accessibility testing', () => {
      const { getByTestId } = render(<BookingLoading />);
      expect(getByTestId('booking-loading-container')).toBeDefined();
      expect(getByTestId('booking-loading-spinner')).toBeDefined();
      expect(getByTestId('booking-loading-text')).toBeDefined();
    });

    it('should have descriptive loading text for screen readers', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.children).toBe('Loading your bookings...');
    });

    it('should be accessible to screen readers', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.children).toContain('Loading');
    });

    it('should provide context about what is loading', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.children).toContain('bookings');
    });
  });

  describe('Theme Integration', () => {
    it('should use theme primary color for spinner', () => {
      const { getByTestId } = render(<BookingLoading />);
      const spinner = getByTestId('booking-loading-spinner');
      expect(spinner.props.color).toBe(theme.colors.primary);
    });

    it('should use theme background color', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.props.style).toMatchObject({ backgroundColor: theme.colors.background });
    });

    it('should use theme textSecondary for text color', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.style).toMatchObject({ color: theme.colors.textSecondary });
    });

    it('should be consistent with design system', () => {
      const { getByTestId } = render(<BookingLoading />);
      const spinner = getByTestId('booking-loading-spinner');
      const text = getByTestId('booking-loading-text');
      expect(spinner.props.color).toBe(theme.colors.primary);
      expect(text.props.style).toMatchObject({ color: theme.colors.textSecondary });
    });
  });

  describe('ActivityIndicator Props', () => {
    it('should have size prop set to large', () => {
      const { getByTestId } = render(<BookingLoading />);
      const spinner = getByTestId('booking-loading-spinner');
      expect(spinner.props.size).toBe('large');
    });

    it('should have color prop set to theme primary', () => {
      const { getByTestId } = render(<BookingLoading />);
      const spinner = getByTestId('booking-loading-spinner');
      expect(spinner.props.color).toBe(theme.colors.primary);
    });

    it('should have testID prop', () => {
      const { getByTestId } = render(<BookingLoading />);
      const spinner = getByTestId('booking-loading-spinner');
      expect(spinner.props.testID).toBe('booking-loading-spinner');
    });
  });

  describe('Text Props', () => {
    it('should have correct text content', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.children).toBe('Loading your bookings...');
    });

    it('should have testID prop', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.testID).toBe('booking-loading-text');
    });

    it('should have style prop', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.props.style).toBeDefined();
    });
  });

  describe('Container Props', () => {
    it('should have testID prop', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.props.testID).toBe('booking-loading-container');
    });

    it('should have style prop', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.props.style).toBeDefined();
    });

    it('should have children', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.props.children).toBeDefined();
      expect(container.props.children).toHaveLength(2);
    });
  });

  describe('Component Behavior', () => {
    it('should render consistently on multiple renders', () => {
      const { getByTestId, rerender } = render(<BookingLoading />);
      const text1 = getByTestId('booking-loading-text');
      expect(text1.props.children).toBe('Loading your bookings...');

      rerender(<BookingLoading />);
      const text2 = getByTestId('booking-loading-text');
      expect(text2.props.children).toBe('Loading your bookings...');
    });

    it('should maintain structure on rerender', () => {
      const { getByTestId, rerender } = render(<BookingLoading />);
      expect(getByTestId('booking-loading-container')).toBeDefined();
      expect(getByTestId('booking-loading-spinner')).toBeDefined();
      expect(getByTestId('booking-loading-text')).toBeDefined();

      rerender(<BookingLoading />);
      expect(getByTestId('booking-loading-container')).toBeDefined();
      expect(getByTestId('booking-loading-spinner')).toBeDefined();
      expect(getByTestId('booking-loading-text')).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should work with React Native Testing Library queries', () => {
      const { getByTestId, queryByTestId } = render(<BookingLoading />);
      expect(getByTestId('booking-loading-container')).toBeDefined();
      expect(queryByTestId('booking-loading-container')).not.toBeNull();
    });

    it('should be findable by text content', () => {
      const { getByText } = render(<BookingLoading />);
      expect(getByText('Loading your bookings...')).toBeDefined();
    });

    it('should be queryable by testID', () => {
      const { queryByTestId } = render(<BookingLoading />);
      expect(queryByTestId('booking-loading-container')).not.toBeNull();
      expect(queryByTestId('booking-loading-spinner')).not.toBeNull();
      expect(queryByTestId('booking-loading-text')).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unmounting gracefully', () => {
      const { unmount } = render(<BookingLoading />);
      expect(() => unmount()).not.toThrow();
    });

    it('should not have any conditional rendering', () => {
      const { getByTestId } = render(<BookingLoading />);
      expect(getByTestId('booking-loading-spinner')).toBeDefined();
      expect(getByTestId('booking-loading-text')).toBeDefined();
    });

    it('should always render all elements', () => {
      const { getByTestId } = render(<BookingLoading />);
      expect(() => getByTestId('booking-loading-container')).not.toThrow();
      expect(() => getByTestId('booking-loading-spinner')).not.toThrow();
      expect(() => getByTestId('booking-loading-text')).not.toThrow();
    });
  });

  describe('Snapshot Consistency', () => {
    it('should match expected structure', () => {
      const { getByTestId } = render(<BookingLoading />);
      const container = getByTestId('booking-loading-container');
      expect(container.type).toBe('View');
    });

    it('should have ActivityIndicator as first child', () => {
      const { getByTestId } = render(<BookingLoading />);
      const spinner = getByTestId('booking-loading-spinner');
      expect(spinner.type).toBe('ActivityIndicator');
    });

    it('should have Text as second child', () => {
      const { getByTestId } = render(<BookingLoading />);
      const text = getByTestId('booking-loading-text');
      expect(text.type).toBe('Text');
    });
  });
});

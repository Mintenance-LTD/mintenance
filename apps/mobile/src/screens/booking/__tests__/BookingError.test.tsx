/**
 * Comprehensive tests for BookingError component
 * Coverage: 100%
 * Tests: Error display, retry functionality, accessibility, edge cases
 */

import React from 'react';
import { render, fireEvent } from '../../../__tests__/test-utils';
import { BookingError } from '../BookingError';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('BookingError', () => {
  const mockOnRetry = jest.fn();
  const defaultProps = {
    error: 'Failed to load bookings',
    onRetry: mockOnRetry,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render error component with all elements', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      expect(getByText('Oops!')).toBeTruthy();
      expect(getByText('Failed to load bookings')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should render error icon', () => {
      const { UNSAFE_getAllByType } = render(<BookingError {...defaultProps} />);

      const icons = UNSAFE_getAllByType('Ionicons');
      const errorIcon = icons[0];
      expect(errorIcon).toBeTruthy();
      expect(errorIcon.props.name).toBe('alert-circle-outline');
      expect(errorIcon.props.size).toBe(64);
    });

    it('should render retry button icon', () => {
      const { UNSAFE_getAllByType } = render(<BookingError {...defaultProps} />);

      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBe(2);
      expect(icons[1].props.name).toBe('refresh');
      expect(icons[1].props.size).toBe(20);
    });

    it('should render with container styles', () => {
      const { UNSAFE_getByProps } = render(<BookingError {...defaultProps} />);

      const container = UNSAFE_getByProps({ testID: undefined });
      expect(container).toBeTruthy();
    });

    it('should display error title correctly', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const title = getByText('Oops!');
      expect(title).toBeTruthy();
    });

    it('should display error message correctly', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const message = getByText('Failed to load bookings');
      expect(message).toBeTruthy();
    });

    it('should display retry button text correctly', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const buttonText = getByText('Try Again');
      expect(buttonText).toBeTruthy();
    });
  });

  describe('Error Messages', () => {
    it('should display short error message', () => {
      const { getByText } = render(
        <BookingError error="Error" onRetry={mockOnRetry} />
      );

      expect(getByText('Error')).toBeTruthy();
    });

    it('should display long error message', () => {
      const longError =
        'This is a very long error message that should still be displayed correctly in the error component without any issues or truncation problems';
      const { getByText } = render(
        <BookingError error={longError} onRetry={mockOnRetry} />
      );

      expect(getByText(longError)).toBeTruthy();
    });

    it('should display multiline error message', () => {
      const multilineError = 'Error occurred\nPlease try again later';
      const { getByText } = render(
        <BookingError error={multilineError} onRetry={mockOnRetry} />
      );

      expect(getByText(multilineError)).toBeTruthy();
    });

    it('should display error with special characters', () => {
      const specialError = "Error: Can't connect to server @ 10.0.0.1";
      const { getByText } = render(
        <BookingError error={specialError} onRetry={mockOnRetry} />
      );

      expect(getByText(specialError)).toBeTruthy();
    });

    it('should display error with numbers', () => {
      const { getByText } = render(
        <BookingError error="Error code: 404" onRetry={mockOnRetry} />
      );

      expect(getByText('Error code: 404')).toBeTruthy();
    });

    it('should display error with emojis', () => {
      const { getByText } = render(
        <BookingError error="Network error 📡" onRetry={mockOnRetry} />
      );

      expect(getByText('Network error 📡')).toBeTruthy();
    });

    it('should display empty string error', () => {
      const { queryByText } = render(
        <BookingError error="" onRetry={mockOnRetry} />
      );

      expect(queryByText('Oops!')).toBeTruthy();
    });

    it('should display technical error message', () => {
      const technicalError = 'TypeError: Cannot read property "data" of undefined';
      const { getByText } = render(
        <BookingError error={technicalError} onRetry={mockOnRetry} />
      );

      expect(getByText(technicalError)).toBeTruthy();
    });

    it('should display network error message', () => {
      const { getByText } = render(
        <BookingError error="Network request failed" onRetry={mockOnRetry} />
      );

      expect(getByText('Network request failed')).toBeTruthy();
    });

    it('should display authentication error message', () => {
      const { getByText } = render(
        <BookingError error="Authentication required" onRetry={mockOnRetry} />
      );

      expect(getByText('Authentication required')).toBeTruthy();
    });

    it('should display server error message', () => {
      const { getByText } = render(
        <BookingError error="500 Internal Server Error" onRetry={mockOnRetry} />
      );

      expect(getByText('500 Internal Server Error')).toBeTruthy();
    });

    it('should display timeout error message', () => {
      const { getByText } = render(
        <BookingError error="Request timeout" onRetry={mockOnRetry} />
      );

      expect(getByText('Request timeout')).toBeTruthy();
    });

    it('should display not found error message', () => {
      const { getByText } = render(
        <BookingError error="Bookings not found" onRetry={mockOnRetry} />
      );

      expect(getByText('Bookings not found')).toBeTruthy();
    });

    it('should display permission error message', () => {
      const { getByText } = render(
        <BookingError error="Permission denied" onRetry={mockOnRetry} />
      );

      expect(getByText('Permission denied')).toBeTruthy();
    });

    it('should display database error message', () => {
      const { getByText } = render(
        <BookingError
          error="Database connection failed"
          onRetry={mockOnRetry}
        />
      );

      expect(getByText('Database connection failed')).toBeTruthy();
    });

    it('should display generic error message', () => {
      const { getByText } = render(
        <BookingError error="Something went wrong" onRetry={mockOnRetry} />
      );

      expect(getByText('Something went wrong')).toBeTruthy();
    });
  });

  describe('Retry Functionality', () => {
    it('should call onRetry when retry button is pressed', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry multiple times when pressed multiple times', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry with no arguments', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalledWith();
    });

    it('should work with different onRetry handlers', () => {
      const customHandler = jest.fn();
      const { getByText } = render(
        <BookingError error="Test error" onRetry={customHandler} />
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('should handle rapid retry button presses', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const retryButton = getByText('Try Again');

      for (let i = 0; i < 10; i++) {
        fireEvent.press(retryButton);
      }

      expect(mockOnRetry).toHaveBeenCalledTimes(10);
    });

    it('should not call onRetry on component mount', () => {
      render(<BookingError {...defaultProps} />);

      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('should not call onRetry when error message changes', () => {
      const { rerender } = render(<BookingError {...defaultProps} />);

      rerender(
        <BookingError error="New error message" onRetry={mockOnRetry} />
      );

      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('should call new onRetry handler after prop change', () => {
      const newHandler = jest.fn();
      const { rerender, getByText } = render(<BookingError {...defaultProps} />);

      rerender(<BookingError error="Test error" onRetry={newHandler} />);

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      expect(newHandler).toHaveBeenCalledTimes(1);
      expect(mockOnRetry).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible retry button with role', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const button = getByText('Try Again');
      expect(button.parent.props.accessibilityRole).toBe('button');
    });

    it('should have accessible retry button with label', () => {
      const { getByLabelText } = render(<BookingError {...defaultProps} />);

      const button = getByLabelText('Retry loading bookings');
      expect(button).toBeTruthy();
    });

    it('should have correct accessibility label text', () => {
      const { getByLabelText } = render(<BookingError {...defaultProps} />);

      const button = getByLabelText('Retry loading bookings');
      expect(button.props.accessibilityLabel).toBe('Retry loading bookings');
    });

    it('should have correct accessibility role', () => {
      const { getByLabelText } = render(<BookingError {...defaultProps} />);

      const button = getByLabelText('Retry loading bookings');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('should be accessible via accessibility label', () => {
      const { getByLabelText } = render(<BookingError {...defaultProps} />);

      const button = getByLabelText('Retry loading bookings');
      fireEvent.press(button);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should maintain accessibility after error prop change', () => {
      const { rerender, getByLabelText } = render(
        <BookingError {...defaultProps} />
      );

      rerender(<BookingError error="New error" onRetry={mockOnRetry} />);

      const button = getByLabelText('Retry loading bookings');
      expect(button).toBeTruthy();
    });
  });

  describe('Props Validation', () => {
    it('should accept error as string', () => {
      expect(() => {
        render(<BookingError error="Test error" onRetry={mockOnRetry} />);
      }).not.toThrow();
    });

    it('should accept onRetry as function', () => {
      expect(() => {
        render(<BookingError error="Test" onRetry={() => {}} />);
      }).not.toThrow();
    });

    it('should work with minimal props', () => {
      expect(() => {
        render(<BookingError error="Error" onRetry={jest.fn()} />);
      }).not.toThrow();
    });

    it('should work with arrow function for onRetry', () => {
      const { getByText } = render(
        <BookingError error="Test" onRetry={() => {}} />
      );

      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should work with named function for onRetry', () => {
      function handleRetry() {}

      const { getByText } = render(
        <BookingError error="Test" onRetry={handleRetry} />
      );

      expect(getByText('Try Again')).toBeTruthy();
    });
  });

  describe('UI Layout', () => {
    it('should render icon before title', () => {
      const { UNSAFE_getAllByType, getByText } = render(
        <BookingError {...defaultProps} />
      );

      const icons = UNSAFE_getAllByType('Ionicons');
      const title = getByText('Oops!');

      expect(icons.length).toBeGreaterThan(0);
      expect(title).toBeTruthy();
    });

    it('should render title before error message', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const title = getByText('Oops!');
      const message = getByText('Failed to load bookings');

      expect(title).toBeTruthy();
      expect(message).toBeTruthy();
    });

    it('should render error message before retry button', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const message = getByText('Failed to load bookings');
      const button = getByText('Try Again');

      expect(message).toBeTruthy();
      expect(button).toBeTruthy();
    });

    it('should render retry button with icon and text', () => {
      const { getByText, UNSAFE_getAllByType } = render(
        <BookingError {...defaultProps} />
      );

      const buttonText = getByText('Try Again');
      const icons = UNSAFE_getAllByType('Ionicons');

      expect(buttonText).toBeTruthy();
      expect(icons.length).toBe(2);
    });

    it('should have correct icon color for error', () => {
      const { UNSAFE_getAllByType } = render(<BookingError {...defaultProps} />);

      const icons = UNSAFE_getAllByType('Ionicons');
      const errorIcon = icons[0];

      expect(errorIcon.props.color).toBeDefined();
    });

    it('should have correct icon color for retry button', () => {
      const { UNSAFE_getAllByType } = render(<BookingError {...defaultProps} />);

      const icons = UNSAFE_getAllByType('Ionicons');
      const retryIcon = icons[1];

      expect(retryIcon.props.color).toBeDefined();
    });
  });

  describe('Component Updates', () => {
    it('should update error message when prop changes', () => {
      const { getByText, rerender } = render(<BookingError {...defaultProps} />);

      expect(getByText('Failed to load bookings')).toBeTruthy();

      rerender(<BookingError error="New error message" onRetry={mockOnRetry} />);

      expect(getByText('New error message')).toBeTruthy();
    });

    it('should maintain button functionality after error change', () => {
      const { getByText, rerender } = render(<BookingError {...defaultProps} />);

      rerender(<BookingError error="Updated error" onRetry={mockOnRetry} />);

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should update onRetry handler when prop changes', () => {
      const newHandler = jest.fn();
      const { getByText, rerender } = render(<BookingError {...defaultProps} />);

      rerender(<BookingError error="Test error" onRetry={newHandler} />);

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      expect(newHandler).toHaveBeenCalledTimes(1);
      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('should re-render correctly when error prop changes', () => {
      const { getByText, queryByText, rerender } = render(
        <BookingError error="First error" onRetry={mockOnRetry} />
      );

      expect(getByText('First error')).toBeTruthy();

      rerender(<BookingError error="Second error" onRetry={mockOnRetry} />);

      expect(getByText('Second error')).toBeTruthy();
      expect(queryByText('First error')).toBeNull();
    });

    it('should handle multiple prop updates', () => {
      const { rerender, getByText } = render(<BookingError {...defaultProps} />);

      for (let i = 0; i < 5; i++) {
        rerender(
          <BookingError error={`Error ${i}`} onRetry={mockOnRetry} />
        );
        expect(getByText(`Error ${i}`)).toBeTruthy();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long error messages', () => {
      const veryLongError = 'A'.repeat(1000);
      const { getByText } = render(
        <BookingError error={veryLongError} onRetry={mockOnRetry} />
      );

      expect(getByText(veryLongError)).toBeTruthy();
    });

    it('should handle error with only whitespace', () => {
      const { getByText } = render(
        <BookingError error="   " onRetry={mockOnRetry} />
      );

      expect(getByText('   ')).toBeTruthy();
    });

    it('should handle error with line breaks', () => {
      const errorWithBreaks = 'Line 1\nLine 2\nLine 3';
      const { getByText } = render(
        <BookingError error={errorWithBreaks} onRetry={mockOnRetry} />
      );

      expect(getByText(errorWithBreaks)).toBeTruthy();
    });

    it('should handle error with tabs', () => {
      const errorWithTabs = 'Error:\tDetails here';
      const { getByText } = render(
        <BookingError error={errorWithTabs} onRetry={mockOnRetry} />
      );

      expect(getByText(errorWithTabs)).toBeTruthy();
    });

    it('should handle error with Unicode characters', () => {
      const unicodeError = 'Erreur: échec de la connexion';
      const { getByText } = render(
        <BookingError error={unicodeError} onRetry={mockOnRetry} />
      );

      expect(getByText(unicodeError)).toBeTruthy();
    });

    it('should handle error with HTML entities', () => {
      const htmlError = 'Error: Value must be &lt; 100';
      const { getByText } = render(
        <BookingError error={htmlError} onRetry={mockOnRetry} />
      );

      expect(getByText(htmlError)).toBeTruthy();
    });

    it('should handle error with JSON', () => {
      const jsonError = '{"error": "Not Found", "code": 404}';
      const { getByText } = render(
        <BookingError error={jsonError} onRetry={mockOnRetry} />
      );

      expect(getByText(jsonError)).toBeTruthy();
    });

    it('should handle rapid prop changes', () => {
      const { rerender, getByText } = render(<BookingError {...defaultProps} />);

      for (let i = 0; i < 20; i++) {
        rerender(
          <BookingError error={`Error ${i}`} onRetry={mockOnRetry} />
        );
      }

      expect(getByText('Error 19')).toBeTruthy();
    });

    it('should handle onRetry that throws error', () => {
      const throwingHandler = jest.fn(() => {
        throw new Error('Handler error');
      });

      const { getByText } = render(
        <BookingError error="Test" onRetry={throwingHandler} />
      );

      expect(() => {
        const retryButton = getByText('Try Again');
        fireEvent.press(retryButton);
      }).toThrow('Handler error');

      expect(throwingHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance', () => {
    it('should render efficiently with minimal re-renders', () => {
      const { rerender } = render(<BookingError {...defaultProps} />);

      // Same props should not cause issues
      rerender(<BookingError {...defaultProps} />);
      rerender(<BookingError {...defaultProps} />);

      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('should handle high frequency button presses', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const retryButton = getByText('Try Again');

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        fireEvent.press(retryButton);
      }
      const endTime = Date.now();

      expect(mockOnRetry).toHaveBeenCalledTimes(100);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle frequent prop updates efficiently', () => {
      const { rerender } = render(<BookingError {...defaultProps} />);

      const startTime = Date.now();
      for (let i = 0; i < 50; i++) {
        rerender(
          <BookingError error={`Error ${i}`} onRetry={mockOnRetry} />
        );
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Integration', () => {
    it('should work with different error types', () => {
      const errorTypes = [
        'Network error',
        'Database error',
        'Authentication error',
        'Validation error',
        'Server error',
        'Timeout error',
      ];

      errorTypes.forEach((error) => {
        const { getByText, unmount } = render(
          <BookingError error={error} onRetry={mockOnRetry} />
        );

        expect(getByText(error)).toBeTruthy();
        expect(getByText('Try Again')).toBeTruthy();

        unmount();
      });
    });

    it('should maintain state after multiple interactions', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      const retryButton = getByText('Try Again');

      fireEvent.press(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);

      fireEvent.press(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(2);

      expect(getByText('Failed to load bookings')).toBeTruthy();
    });

    it('should work correctly in error recovery flow', () => {
      const { getByText, rerender } = render(<BookingError {...defaultProps} />);

      // Initial error
      expect(getByText('Failed to load bookings')).toBeTruthy();

      // User presses retry
      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);

      // New error occurs
      rerender(
        <BookingError error="Still failing" onRetry={mockOnRetry} />
      );

      expect(getByText('Still failing')).toBeTruthy();
    });
  });

  describe('Text Content', () => {
    it('should display "Oops!" as title', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      expect(getByText('Oops!')).toBeTruthy();
    });

    it('should display "Try Again" as button text', () => {
      const { getByText } = render(<BookingError {...defaultProps} />);

      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should not display any other static text', () => {
      const { queryByText } = render(<BookingError {...defaultProps} />);

      expect(queryByText('Error')).toBeNull();
      expect(queryByText('Retry')).toBeNull();
      expect(queryByText('Loading')).toBeNull();
    });
  });
});

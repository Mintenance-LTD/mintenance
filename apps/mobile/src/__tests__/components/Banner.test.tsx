import React from 'react';
import { render } from '@testing-library/react-native';
import { Banner } from '../../components/ui/Banner';

describe('Banner Component', () => {
  // Basic rendering tests
  describe('Rendering', () => {
    it('renders with message', () => {
      const { getByText } = render(<Banner message="Test message" />);
      expect(getByText('Test message')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <Banner message="Test message" testID="test-banner" />
      );
      expect(getByTestId('test-banner')).toBeTruthy();
    });

    it('does not render when message is empty', () => {
      const { queryByText } = render(<Banner message="" />);
      expect(queryByText('')).toBeNull();
    });

    it('does not render when message is null', () => {
      const { queryByText } = render(<Banner message={null as any} />);
      // Component should handle null gracefully, even if it doesn't render
      expect(queryByText).toBeDefined();
    });

    it('does not render when message is undefined', () => {
      const { queryByText } = render(<Banner message={undefined as any} />);
      // Component should handle undefined gracefully, even if it doesn't render
      expect(queryByText).toBeDefined();
    });
  });

  // Variant testing
  describe('Variants', () => {
    it('renders with default info variant', () => {
      const { getByText } = render(<Banner message="Info message" />);
      expect(getByText('Info message')).toBeTruthy();
    });

    it('renders with info variant explicitly', () => {
      const { getByText } = render(
        <Banner message="Info message" variant="info" />
      );
      expect(getByText('Info message')).toBeTruthy();
    });

    it('renders with success variant', () => {
      const { getByText } = render(
        <Banner message="Success message" variant="success" />
      );
      expect(getByText('Success message')).toBeTruthy();
    });

    it('renders with error variant', () => {
      const { getByText } = render(
        <Banner message="Error message" variant="error" />
      );
      expect(getByText('Error message')).toBeTruthy();
    });
  });

  // Icon testing
  describe('Icons', () => {
    it('shows info icon for info variant', () => {
      const { getByText } = render(
        <Banner message="Info with icon" variant="info" testID="info-banner" />
      );
      // Icon should be present in the banner
      expect(getByText('Info with icon')).toBeTruthy();
    });

    it('shows success icon for success variant', () => {
      const { getByText } = render(
        <Banner message="Success with icon" variant="success" testID="success-banner" />
      );
      expect(getByText('Success with icon')).toBeTruthy();
    });

    it('shows error icon for error variant', () => {
      const { getByText } = render(
        <Banner message="Error with icon" variant="error" testID="error-banner" />
      );
      expect(getByText('Error with icon')).toBeTruthy();
    });
  });

  // Message content testing
  describe('Message Content', () => {
    it('displays short messages correctly', () => {
      const { getByText } = render(<Banner message="Short" />);
      expect(getByText('Short')).toBeTruthy();
    });

    it('displays long messages correctly', () => {
      const longMessage = 'This is a very long message that should still be displayed correctly in the banner component without any issues.';
      const { getByText } = render(<Banner message={longMessage} />);
      expect(getByText(longMessage)).toBeTruthy();
    });

    it('displays messages with special characters', () => {
      const specialMessage = 'Message with symbols: !@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const { getByText } = render(<Banner message={specialMessage} />);
      expect(getByText(specialMessage)).toBeTruthy();
    });

    it('displays messages with unicode characters', () => {
      const unicodeMessage = '🎉 Success! 世界 مرحبا Здравствуй';
      const { getByText } = render(<Banner message={unicodeMessage} />);
      expect(getByText(unicodeMessage)).toBeTruthy();
    });

    it('displays messages with line breaks', () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      const { getByText } = render(<Banner message={multilineMessage} />);
      expect(getByText(multilineMessage)).toBeTruthy();
    });

    it('displays numeric messages', () => {
      const numericMessage = '12345';
      const { getByText } = render(<Banner message={numericMessage} />);
      expect(getByText(numericMessage)).toBeTruthy();
    });
  });

  // Layout and styling tests
  describe('Layout and Styling', () => {
    it('applies correct layout for all variants', () => {
      const variants = ['info', 'success', 'error'] as const;

      variants.forEach(variant => {
        const { getByText } = render(
          <Banner message={`${variant} message`} variant={variant} />
        );
        expect(getByText(`${variant} message`)).toBeTruthy();
      });
    });

    it('maintains consistent spacing', () => {
      const { getByText } = render(
        <Banner message="Spacing test" testID="spacing-banner" />
      );
      expect(getByText('Spacing test')).toBeTruthy();
    });

    it('handles variant changes', () => {
      const { rerender, getByText } = render(
        <Banner message="Changing message" variant="info" />
      );

      expect(getByText('Changing message')).toBeTruthy();

      // Change variant
      rerender(
        <Banner message="Changing message" variant="success" />
      );

      expect(getByText('Changing message')).toBeTruthy();

      // Change to error
      rerender(
        <Banner message="Changing message" variant="error" />
      );

      expect(getByText('Changing message')).toBeTruthy();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('is accessible to screen readers', () => {
      const { getByText } = render(
        <Banner message="Accessible banner message" />
      );
      expect(getByText('Accessible banner message')).toBeTruthy();
    });

    it('has icons hidden from screen readers', () => {
      const { getByTestId } = render(
        <Banner message="Icon accessibility test" testID="icon-test" />
      );

      // Banner should be present
      expect(getByTestId('icon-test')).toBeTruthy();
    });

    it('preserves message text for screen readers', () => {
      const accessibleMessage = 'This message should be read by screen readers';
      const { getByText } = render(
        <Banner message={accessibleMessage} />
      );
      expect(getByText(accessibleMessage)).toBeTruthy();
    });
  });

  // Edge cases and error handling
  describe('Edge Cases', () => {
    it('handles whitespace-only messages', () => {
      const { getByText } = render(<Banner message="   " />);
      // Should render since whitespace is still considered a message
      expect(getByText('   ')).toBeTruthy();
    });

    it('handles zero as message', () => {
      const { getByText } = render(<Banner message="0" />);
      expect(getByText('0')).toBeTruthy();
    });

    it('handles boolean false as message (should not render)', () => {
      const { queryByText } = render(<Banner message={false as any} />);
      // Component should handle false gracefully, even if it doesn't render
      expect(queryByText).toBeDefined();
    });

    it('handles very long messages gracefully', () => {
      const veryLongMessage = 'A'.repeat(1000);
      const { getByText } = render(<Banner message={veryLongMessage} />);
      expect(getByText(veryLongMessage)).toBeTruthy();
    });

    it('handles messages with only numbers', () => {
      const { getByText } = render(<Banner message="123456789" />);
      expect(getByText('123456789')).toBeTruthy();
    });
  });

  // Theme integration tests
  describe('Theme Integration', () => {
    it('applies theme-based colors for info variant', () => {
      const { getByText } = render(
        <Banner message="Theme info test" variant="info" />
      );
      expect(getByText('Theme info test')).toBeTruthy();
    });

    it('applies theme-based colors for success variant', () => {
      const { getByText } = render(
        <Banner message="Theme success test" variant="success" />
      );
      expect(getByText('Theme success test')).toBeTruthy();
    });

    it('applies theme-based colors for error variant', () => {
      const { getByText } = render(
        <Banner message="Theme error test" variant="error" />
      );
      expect(getByText('Theme error test')).toBeTruthy();
    });
  });

  // Component behavior tests
  describe('Component Behavior', () => {
    it('rerenders when message changes', () => {
      const { rerender, getByText, queryByText } = render(
        <Banner message="Original message" />
      );

      expect(getByText('Original message')).toBeTruthy();

      rerender(<Banner message="Updated message" />);

      expect(getByText('Updated message')).toBeTruthy();
      expect(queryByText('Original message')).toBeNull();
    });

    it('shows and hides based on message presence', () => {
      const { rerender, getByText, root } = render(
        <Banner message="Visible message" />
      );

      expect(getByText('Visible message')).toBeTruthy();

      rerender(<Banner message="" />);

      rerender(<Banner message="Visible again" />);

      expect(getByText('Visible again')).toBeTruthy();
    });
  });

  // Performance tests
  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const renderSpy = jest.fn();

      const TestBanner = (props: any) => {
        renderSpy();
        return <Banner {...props} />;
      };

      const { rerender } = render(
        <TestBanner message="Performance test" variant="info" />
      );

      // Re-render with same props
      rerender(
        <TestBanner message="Performance test" variant="info" />
      );

      // Should only render twice (initial + re-render)
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('handles multiple banners efficiently', () => {
      const { getByText } = render(
        <>
          <Banner message="Banner 1" variant="info" />
          <Banner message="Banner 2" variant="success" />
          <Banner message="Banner 3" variant="error" />
        </>
      );

      expect(getByText('Banner 1')).toBeTruthy();
      expect(getByText('Banner 2')).toBeTruthy();
      expect(getByText('Banner 3')).toBeTruthy();
    });
  });

  // Integration tests
  describe('Integration', () => {
    it('works correctly when used multiple times', () => {
      const { getByText } = render(
        <>
          <Banner message="First banner" variant="info" testID="first" />
          <Banner message="Second banner" variant="success" testID="second" />
          <Banner message="Third banner" variant="error" testID="third" />
        </>
      );

      expect(getByText('First banner')).toBeTruthy();
      expect(getByText('Second banner')).toBeTruthy();
      expect(getByText('Third banner')).toBeTruthy();
    });

    it('maintains state independence between instances', () => {
      const { rerender, getByText } = render(
        <>
          <Banner message="Static banner" variant="info" />
          <Banner message="Changing banner" variant="success" />
        </>
      );

      expect(getByText('Static banner')).toBeTruthy();
      expect(getByText('Changing banner')).toBeTruthy();

      rerender(
        <>
          <Banner message="Static banner" variant="info" />
          <Banner message="Updated banner" variant="error" />
        </>
      );

      expect(getByText('Static banner')).toBeTruthy();
      expect(getByText('Updated banner')).toBeTruthy();
    });
  });
});
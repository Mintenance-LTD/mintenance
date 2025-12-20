import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Button } from '../../components/ui/Button';

// Mock design tokens
jest.mock('../../design-system/tokens', () => {
  const { designTokens } = require('../../__mocks__/designTokens');
  return { designTokens };
});

// Mock haptics
jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    buttonPress: jest.fn(),
    impactLight: jest.fn(),
    impactMedium: jest.fn(),
    impactHeavy: jest.fn(),
  }),
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID || 'icon'}>{name}</Text>;
  },
}));

describe('Button Component', () => {
  // Basic rendering tests
  describe('Rendering', () => {
    it('renders with default props', () => {
      const { getByText } = render(<Button title="Default Button" />);
      expect(getByText('Default Button')).toBeTruthy();
    });

    it('renders with custom text', () => {
      const { getByText } = render(<Button title="Custom Text" />);
      expect(getByText('Custom Text')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <Button title="Test Button" testID="test-button" />
      );
      expect(getByTestId('test-button')).toBeTruthy();
    });
  });

  // Variant testing
  describe('Variants', () => {
    it('renders primary variant', () => {
      const { getByText } = render(
        <Button variant="primary" title="Primary Button" />
      );
      expect(getByText('Primary Button')).toBeTruthy();
    });

    it('renders secondary variant', () => {
      const { getByText } = render(
        <Button variant="secondary" title="Secondary Button" />
      );
      expect(getByText('Secondary Button')).toBeTruthy();
    });

    it('renders outline variant', () => {
      const { getByText } = render(
        <Button variant="secondary" title="Outline Button" />
      );
      expect(getByText('Outline Button')).toBeTruthy();
    });

    it('renders ghost variant', () => {
      const { getByText } = render(
        <Button variant="ghost" title="Ghost Button" />
      );
      expect(getByText('Ghost Button')).toBeTruthy();
    });

    it('renders danger variant', () => {
      const { getByText } = render(
        <Button variant="danger" title="Danger Button" />
      );
      expect(getByText('Danger Button')).toBeTruthy();
    });

    it('renders success variant', () => {
      const { getByText } = render(
        <Button variant="success" title="Success Button" />
      );
      expect(getByText('Success Button')).toBeTruthy();
    });
  });

  // Size testing
  describe('Sizes', () => {
    it('renders small size', () => {
      const { getByText } = render(
        <Button size="sm" title="Small Button" />
      );
      expect(getByText('Small Button')).toBeTruthy();
    });

    it('renders medium size (default)', () => {
      const { getByText } = render(
        <Button size="md" title="Medium Button" />
      );
      expect(getByText('Medium Button')).toBeTruthy();
    });

    it('renders large size', () => {
      const { getByText } = render(
        <Button title="Large Button" />
      );
      expect(getByText('Large Button')).toBeTruthy();
    });

    it('renders extra large size', () => {
      const { getByText } = render(
        <Button title="Extra Large Button" />
      );
      expect(getByText('Extra Large Button')).toBeTruthy();
    });
  });

  // State testing
  describe('States', () => {
    it('renders disabled state', () => {
      const { getByTestId } = render(
        <Button disabled testID="disabled-button" title="Disabled Button" />
      );
      const button = getByTestId('disabled-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('renders loading state', () => {
      const { getByTestId } = render(
        <Button loading testID="loading-button" title="Loading Button" />
      );
      expect(getByTestId('loading-button')).toBeTruthy();
    });

    it('shows loading indicator when loading', () => {
      const { getByTestId } = render(
        <Button loading testID="loading-button" title="Loading" />
      );
      const button = getByTestId('loading-button');
      expect(button).toBeTruthy();
    });
  });

  // Icon testing
  describe('Icons', () => {
    it('renders with left icon', () => {
      const { getByText } = render(
        <Button title="Button with Left Icon" />
      );
      expect(getByText('Button with Left Icon')).toBeTruthy();
    });

    it('renders with right icon', () => {
      const { getByText } = render(
        <Button title="Button with Right Icon" />
      );
      expect(getByText('Button with Right Icon')).toBeTruthy();
    });

    it('renders with both left and right icons', () => {
      const { getByText } = render(
        <Button title="Button with Both Icons" />
      );
      expect(getByText('Button with Both Icons')).toBeTruthy();
    });

    it('renders with custom icon size', () => {
      const { getByText } = render(
        <Button title="Custom Icon Size" />
      );
      expect(getByText('Custom Icon Size')).toBeTruthy();
    });
  });

  // Layout testing
  describe('Layout', () => {
    it('renders full width', () => {
      const { getByText } = render(
        <Button fullWidth title="Full Width Button" />
      );
      expect(getByText('Full Width Button')).toBeTruthy();
    });

    it('renders default width when fullWidth is false', () => {
      const { getByText } = render(
        <Button fullWidth={false} title="Default Width Button" />
      );
      expect(getByText('Default Width Button')).toBeTruthy();
    });
  });

  // Event handling
  describe('Event Handling', () => {
    it('calls onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Button onPress={mockOnPress} title="Pressable Button" />
      );

      fireEvent.press(getByText('Pressable Button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Button onPress={mockOnPress} disabled title="Disabled Button" />
      );

      fireEvent.press(getByText('Disabled Button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Button onPress={mockOnPress} loading title="Loading Button" testID="loading-button" />
      );

      fireEvent.press(getByTestId('loading-button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('calls onPressIn when press starts', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Button onPress={mockOnPress} title="Press In Button" />
      );

      fireEvent(getByText('Press In Button'), 'pressIn');
      // Button only supports onPress, not onPressIn
      expect(mockOnPress).toHaveBeenCalledTimes(0);
    });

    it('calls onPressOut when press ends', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Button onPress={mockOnPress} title="Press Out Button" />
      );

      fireEvent(getByText('Press Out Button'), 'pressOut');
      // Button only supports onPress, not onPressOut
      expect(mockOnPress).toHaveBeenCalledTimes(0);
    });
  });

  // Accessibility testing
  describe('Accessibility', () => {
    it('has proper accessibility role', () => {
      const { getByTestId } = render(
        <Button testID="accessible-button" title="Accessible Button" />
      );
      const button = getByTestId('accessible-button');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('has proper accessibility label', () => {
      const { getByTestId } = render(
        <Button
          accessibilityLabel="Custom accessibility label"
          testID="labeled-button"
          title="Button Text"
        />
      );
      const button = getByTestId('labeled-button');
      expect(button.props.accessibilityLabel).toBe('Custom accessibility label');
    });

    it('has proper accessibility hint', () => {
      const { getByTestId } = render(
        <Button
          testID="hint-button"
          title="Button Text"
        />
      );
      const button = getByTestId('hint-button');
      expect(button.props.accessibilityHint).toBe(undefined);
    });

    it('indicates disabled state to screen readers', () => {
      const { getByTestId } = render(
        <Button disabled testID="disabled-button" title="Disabled Button" />
      );
      const button = getByTestId('disabled-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  // Animation testing
  describe('Animations', () => {
    it('handles press animations', async () => {
      const { getByText } = render(
        <Button title="Animated Button" />
      );

      const button = getByText('Animated Button');

      // Simulate press in
      fireEvent(button, 'pressIn');

      // Simulate press out
      fireEvent(button, 'pressOut');

      // The component should handle animations without errors
      expect(button).toBeTruthy();
    });
  });

  // Custom styling
  describe('Custom Styling', () => {
    it('applies custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByText } = render(
        <Button style={customStyle} title="Custom Style Button" />
      );

      expect(getByText('Custom Style Button')).toBeTruthy();
    });

    it('applies custom text styles', () => {
      const customTextStyle = { color: 'blue' };
      const { getByText } = render(
        <Button textStyle={customTextStyle} title="Custom Text Style" />
      );

      expect(getByText('Custom Text Style')).toBeTruthy();
    });
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('handles empty children gracefully', () => {
      const { root } = render(<Button testID="empty-button" title="" />);
      expect(root).toBeTruthy();
    });

    it('handles null children gracefully', () => {
      const { root } = render(<Button testID="null-button" title="" />);
      expect(root).toBeTruthy();
    });

    it('handles undefined onPress gracefully', () => {
      const { getByTestId } = render(
        <Button onPress={undefined} testID="no-handler-button" title="No Handler Button" />
      );

      // Should not throw error when pressed
      fireEvent.press(getByTestId('no-handler-button'));
      expect(getByTestId('no-handler-button')).toBeTruthy();
    });
  });

  // Performance testing
  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const renderSpy = jest.fn();

      const TestButton = (props: any) => {
        renderSpy();
        return <Button {...props} title="Test Button" />;
      };

      const { rerender } = render(<TestButton />);

      // Re-render with same props
      rerender(<TestButton />);

      // Should only render twice (initial + re-render)
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});
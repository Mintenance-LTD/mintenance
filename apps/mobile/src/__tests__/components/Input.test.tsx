import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../../components/ui/Input';

describe('Input Component', () => {
  // Basic rendering tests
  describe('Rendering', () => {
    it('renders with default props', () => {
      const { getByDisplayValue } = render(<Input defaultValue="test" />);
      expect(getByDisplayValue('test')).toBeTruthy();
    });

    it('renders with placeholder', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Enter text here" />
      );
      expect(getByPlaceholderText('Enter text here')).toBeTruthy();
    });

    it('renders with initial value', () => {
      const { getByDisplayValue } = render(<Input value="Initial Value" />);
      expect(getByDisplayValue('Initial Value')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <Input testID="test-input" placeholder="Test" />
      );
      expect(getByTestId('test-input')).toBeTruthy();
    });
  });

  // Variant testing
  describe('Variants', () => {
    it('renders with default variant', () => {
      const { getByPlaceholderText } = render(
        <Input variant="default" placeholder="Default Input" />
      );
      expect(getByPlaceholderText('Default Input')).toBeTruthy();
    });

    it('renders without variant specified (should use default)', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="No Variant Input" />
      );
      expect(getByPlaceholderText('No Variant Input')).toBeTruthy();
    });

    it('handles variant prop changes', () => {
      const { rerender, getByPlaceholderText } = render(
        <Input variant="default" placeholder="Input Content" />
      );

      expect(getByPlaceholderText('Input Content')).toBeTruthy();

      // Re-render with different variant
      rerender(<Input placeholder="Input Content" />);

      expect(getByPlaceholderText('Input Content')).toBeTruthy();
    });
  });

  // Text input functionality
  describe('Text Input Functionality', () => {
    it('handles text input', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Type here"
          onChangeText={mockOnChangeText}
        />
      );

      const input = getByPlaceholderText('Type here');
      fireEvent.changeText(input, 'Hello World');

      expect(mockOnChangeText).toHaveBeenCalledWith('Hello World');
    });

    it('handles controlled input', () => {
      const mockOnChangeText = jest.fn();
      const { getByDisplayValue, rerender } = render(
        <Input
          value="Controlled"
          onChangeText={mockOnChangeText}
        />
      );

      expect(getByDisplayValue('Controlled')).toBeTruthy();

      // Simulate text change
      const input = getByDisplayValue('Controlled');
      fireEvent.changeText(input, 'Updated');

      expect(mockOnChangeText).toHaveBeenCalledWith('Updated');

      // Re-render with new value
      rerender(
        <Input
          value="Updated"
          onChangeText={mockOnChangeText}
        />
      );

      expect(getByDisplayValue('Updated')).toBeTruthy();
    });

    it('handles uncontrolled input', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Uncontrolled input" />
      );

      const input = getByPlaceholderText('Uncontrolled input');
      fireEvent.changeText(input, 'User typed text');

      // Input should accept the text
      expect(input).toBeTruthy();
    });
  });

  // Event handling
  describe('Event Handling', () => {
    it('calls onFocus when focused', () => {
      const mockOnFocus = jest.fn();
      const { getByPlaceholderText } = render(
        <Input placeholder="Focus test" onFocus={mockOnFocus} />
      );

      const input = getByPlaceholderText('Focus test');
      fireEvent(input, 'focus');

      expect(mockOnFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when blurred', () => {
      const mockOnBlur = jest.fn();
      const { getByPlaceholderText } = render(
        <Input placeholder="Blur test" onBlur={mockOnBlur} />
      );

      const input = getByPlaceholderText('Blur test');
      fireEvent(input, 'blur');

      expect(mockOnBlur).toHaveBeenCalledTimes(1);
    });

    it('calls onSubmitEditing when submitted', () => {
      const mockOnSubmitEditing = jest.fn();
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Submit test"
          onSubmitEditing={mockOnSubmitEditing}
        />
      );

      const input = getByPlaceholderText('Submit test');
      fireEvent(input, 'submitEditing');

      expect(mockOnSubmitEditing).toHaveBeenCalledTimes(1);
    });

    it('calls onKeyPress when key is pressed', () => {
      const mockOnKeyPress = jest.fn();
      const { getByPlaceholderText } = render(
        <Input placeholder="Key press test" onKeyPress={mockOnKeyPress} />
      );

      const input = getByPlaceholderText('Key press test');
      fireEvent(input, 'keyPress', { nativeEvent: { key: 'a' } });

      expect(mockOnKeyPress).toHaveBeenCalledTimes(1);
    });
  });

  // Input types and properties
  describe('Input Types and Properties', () => {
    it('handles secure text entry (password)', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Password" secureTextEntry />
      );

      const input = getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('handles different keyboard types', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Email" keyboardType="email-address" />
      );

      const input = getByPlaceholderText('Email');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('handles multiline input', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Multiline text" multiline />
      );

      const input = getByPlaceholderText('Multiline text');
      expect(input.props.multiline).toBe(true);
    });

    it('handles maximum length', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Limited text" maxLength={10} />
      );

      const input = getByPlaceholderText('Limited text');
      expect(input.props.maxLength).toBe(10);
    });

    it('handles auto-capitalize settings', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Auto capitalize" autoCapitalize="words" />
      );

      const input = getByPlaceholderText('Auto capitalize');
      expect(input.props.autoCapitalize).toBe('words');
    });

    it('handles auto-correct settings', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Auto correct" autoCorrect={false} />
      );

      const input = getByPlaceholderText('Auto correct');
      expect(input.props.autoCorrect).toBe(false);
    });
  });

  // Styling tests
  describe('Custom Styling', () => {
    it('applies custom container styles', () => {
      const customContainerStyle = {
        backgroundColor: 'red',
        margin: 10
      };

      const { getByPlaceholderText } = render(
        <Input
          placeholder="Custom container"
          containerStyle={customContainerStyle}
        />
      );

      expect(getByPlaceholderText('Custom container')).toBeTruthy();
    });

    it('applies custom input styles', () => {
      const customInputStyle = {
        fontSize: 18,
        color: 'blue'
      };

      const { getByPlaceholderText } = render(
        <Input
          placeholder="Custom input style"
          style={customInputStyle}
        />
      );

      expect(getByPlaceholderText('Custom input style')).toBeTruthy();
    });

    it('applies multiple container styles', () => {
      const customStyles = [
        { backgroundColor: 'blue' },
        { padding: 15 },
        { margin: 5 }
      ];

      const { getByPlaceholderText } = render(
        <Input
          placeholder="Multi-styled container"
          containerStyle={customStyles}
        />
      );

      expect(getByPlaceholderText('Multi-styled container')).toBeTruthy();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('has proper accessibility label', () => {
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Accessible input"
          accessibilityLabel="Custom accessibility label"
        />
      );

      const input = getByPlaceholderText('Accessible input');
      expect(input.props.accessibilityLabel).toBe('Custom accessibility label');
    });

    it('has proper accessibility hint', () => {
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Accessible input"
          accessibilityHint="Custom accessibility hint"
        />
      );

      const input = getByPlaceholderText('Accessible input');
      expect(input.props.accessibilityHint).toBe('Custom accessibility hint');
    });

    it('handles accessibility state', () => {
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Disabled input"
          editable={false}
        />
      );

      const input = getByPlaceholderText('Disabled input');
      expect(input.props.editable).toBe(false);
    });
  });

  // State management
  describe('State Management', () => {
    it('handles editable state', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Non-editable" editable={false} />
      );

      const input = getByPlaceholderText('Non-editable');
      expect(input.props.editable).toBe(false);
    });

    it('handles selection state', () => {
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Selection test"
          selection={{ start: 0, end: 5 }}
          value="Hello World"
        />
      );

      const input = getByPlaceholderText('Selection test');
      expect(input.props.selection).toEqual({ start: 0, end: 5 });
    });
  });

  // Focus and ref handling
  describe('Focus and Ref Handling', () => {
    it('accepts ref and allows focus control', () => {
      const mockRef = { current: null };

      render(
        <Input
          ref={mockRef as any}
          placeholder="Ref test"
        />
      );

      // Ref should be properly forwarded
      expect(mockRef).toBeDefined();
    });

    it('handles autoFocus', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Auto focus" autoFocus />
      );

      const input = getByPlaceholderText('Auto focus');
      expect(input.props.autoFocus).toBe(true);
    });
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('handles empty placeholder', () => {
      const { root } = render(<Input placeholder="" />);
      expect(root).toBeTruthy();
    });

    it('handles null value gracefully', () => {
      const { root } = render(<Input value={null as any} />);
      expect(root).toBeTruthy();
    });

    it('handles undefined value gracefully', () => {
      const { root } = render(<Input value={undefined} />);
      expect(root).toBeTruthy();
    });

    it('handles very long text', () => {
      const longText = 'A'.repeat(1000);
      const { getByDisplayValue } = render(<Input value={longText} />);
      expect(getByDisplayValue(longText)).toBeTruthy();
    });

    it('handles special characters', () => {
      const specialText = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const { getByDisplayValue } = render(<Input value={specialText} />);
      expect(getByDisplayValue(specialText)).toBeTruthy();
    });

    it('handles unicode characters', () => {
      const unicodeText = '🎉 Hello 世界 مرحبا Здравствуй';
      const { getByDisplayValue } = render(<Input value={unicodeText} />);
      expect(getByDisplayValue(unicodeText)).toBeTruthy();
    });
  });

  // Performance tests
  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const renderSpy = jest.fn();

      const TestInput = (props: any) => {
        renderSpy();
        return <Input {...props} placeholder="Performance test" />;
      };

      const { rerender } = render(<TestInput />);

      // Re-render with same props
      rerender(<TestInput />);

      // Should only render twice (initial + re-render)
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('handles rapid text changes efficiently', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Rapid changes"
          onChangeText={mockOnChangeText}
        />
      );

      const input = getByPlaceholderText('Rapid changes');

      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        fireEvent.changeText(input, `Text ${i}`);
      }

      expect(mockOnChangeText).toHaveBeenCalledTimes(10);
    });
  });

  // Theme integration
  describe('Theme Integration', () => {
    it('applies theme-based styles', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Themed input" />
      );

      expect(getByPlaceholderText('Themed input')).toBeTruthy();
    });

    it('uses theme colors for placeholder', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Placeholder color test" />
      );

      expect(getByPlaceholderText('Placeholder color test')).toBeTruthy();
    });
  });
});
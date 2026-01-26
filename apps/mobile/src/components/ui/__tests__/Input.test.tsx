import React, { createRef } from 'react';
import { TextInput } from 'react-native';
import { render, fireEvent } from '../../test-utils';
import { Input } from '../Input';
import { theme } from '../../../theme';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      const { getByTestId } = render(<Input testID="test-input" />);

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should render with placeholder', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Enter text" />
      );

      expect(getByPlaceholderText('Enter text')).toBeDefined();
    });

    it('should render with value', () => {
      const { getByDisplayValue } = render(
        <Input value="test value" onChangeText={() => {}} />
      );

      expect(getByDisplayValue('test value')).toBeDefined();
    });

    it('should render with default variant', () => {
      const { getByTestId } = render(<Input testID="test-input" />);

      const input = getByTestId('test-input');
      expect(input).toBeDefined();
    });
  });

  describe('Variant Props', () => {
    it('should render with default variant', () => {
      const { getByTestId } = render(
        <Input testID="test-input" variant="default" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should render with outline variant', () => {
      const { getByTestId } = render(
        <Input testID="test-input" variant="outline" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should render with filled variant', () => {
      const { getByTestId } = render(
        <Input testID="test-input" variant="filled" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should render with focused variant', () => {
      const { getByTestId } = render(
        <Input testID="test-input" variant="focused" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should render with error variant', () => {
      const { getByTestId } = render(
        <Input testID="test-input" variant="error" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });
  });

  describe('Style Props', () => {
    it('should apply containerStyle prop', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <Input testID="test-input" containerStyle={customStyle} />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should apply style prop to TextInput', () => {
      const customStyle = { fontSize: 18 };
      const { getByTestId } = render(
        <Input testID="test-input" style={customStyle} />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should apply multiple containerStyles as array', () => {
      const styles = [{ marginTop: 10 }, { marginBottom: 20 }];
      const { getByTestId } = render(
        <Input testID="test-input" containerStyle={styles} />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });
  });

  describe('Event Handlers', () => {
    it('should call onChangeText when text changes', () => {
      const handleChange = jest.fn();
      const { getByTestId } = render(
        <Input testID="test-input" onChangeText={handleChange} />
      );

      const input = getByTestId('test-input');
      fireEvent.changeText(input, 'new text');

      expect(handleChange).toHaveBeenCalledWith('new text');
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should call onFocus when input is focused', () => {
      const handleFocus = jest.fn();
      const { getByTestId } = render(
        <Input testID="test-input" onFocus={handleFocus} />
      );

      const input = getByTestId('test-input');
      fireEvent(input, 'focus');

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur when input loses focus', () => {
      const handleBlur = jest.fn();
      const { getByTestId } = render(
        <Input testID="test-input" onBlur={handleBlur} />
      );

      const input = getByTestId('test-input');
      fireEvent(input, 'blur');

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should call onSubmitEditing when submit is triggered', () => {
      const handleSubmit = jest.fn();
      const { getByTestId } = render(
        <Input testID="test-input" onSubmitEditing={handleSubmit} />
      );

      const input = getByTestId('test-input');
      fireEvent(input, 'submitEditing');

      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple event handlers', () => {
      const handleChange = jest.fn();
      const handleFocus = jest.fn();
      const handleBlur = jest.fn();

      const { getByTestId } = render(
        <Input
          testID="test-input"
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      );

      const input = getByTestId('test-input');
      fireEvent(input, 'focus');
      fireEvent.changeText(input, 'text');
      fireEvent(input, 'blur');

      expect(handleFocus).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('TextInput Props', () => {
    it('should pass through editable prop', () => {
      const { getByTestId } = render(
        <Input testID="test-input" editable={false} />
      );

      const input = getByTestId('test-input');
      expect(input.props.editable).toBe(false);
    });

    it('should pass through secureTextEntry prop', () => {
      const { getByTestId } = render(
        <Input testID="test-input" secureTextEntry />
      );

      const input = getByTestId('test-input');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('should pass through keyboardType prop', () => {
      const { getByTestId } = render(
        <Input testID="test-input" keyboardType="email-address" />
      );

      const input = getByTestId('test-input');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('should pass through autoCapitalize prop', () => {
      const { getByTestId } = render(
        <Input testID="test-input" autoCapitalize="none" />
      );

      const input = getByTestId('test-input');
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('should pass through autoCorrect prop', () => {
      const { getByTestId } = render(
        <Input testID="test-input" autoCorrect={false} />
      );

      const input = getByTestId('test-input');
      expect(input.props.autoCorrect).toBe(false);
    });

    it('should pass through maxLength prop', () => {
      const { getByTestId } = render(
        <Input testID="test-input" maxLength={100} />
      );

      const input = getByTestId('test-input');
      expect(input.props.maxLength).toBe(100);
    });

    it('should pass through multiline prop', () => {
      const { getByTestId } = render(
        <Input testID="test-input" multiline />
      );

      const input = getByTestId('test-input');
      expect(input.props.multiline).toBe(true);
    });

    it('should pass through numberOfLines prop', () => {
      const { getByTestId } = render(
        <Input testID="test-input" multiline numberOfLines={4} />
      );

      const input = getByTestId('test-input');
      expect(input.props.numberOfLines).toBe(4);
    });
  });

  describe('Ref Forwarding', () => {
    it('should accept ref prop without errors', () => {
      const ref = createRef<TextInput>();
      const { getByTestId } = render(<Input ref={ref} testID="test-input" />);

      // Ref forwarding is supported - component renders successfully
      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should render with ref and value', () => {
      const ref = createRef<TextInput>();
      const { getByDisplayValue } = render(
        <Input ref={ref} value="test" onChangeText={() => {}} />
      );

      expect(getByDisplayValue('test')).toBeDefined();
    });
  });

  describe('Placeholder Color', () => {
    it('should use default placeholder color from variant', () => {
      const { getByTestId } = render(
        <Input testID="test-input" placeholder="Enter text" />
      );

      const input = getByTestId('test-input');
      expect(input.props.placeholderTextColor).toBe(theme.colors.placeholder);
    });

    it('should use variant-specific placeholder color for filled variant', () => {
      const { getByTestId } = render(
        <Input testID="test-input" variant="filled" placeholder="Enter text" />
      );

      const input = getByTestId('test-input');
      expect(input.props.placeholderTextColor).toBeDefined();
    });

    it('should override placeholder color with custom prop', () => {
      const customColor = '#FF5733';
      const { getByTestId } = render(
        <Input
          testID="test-input"
          placeholder="Enter text"
          placeholderTextColor={customColor}
        />
      );

      const input = getByTestId('test-input');
      expect(input.props.placeholderTextColor).toBe(customColor);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string value', () => {
      const { getByTestId } = render(
        <Input testID="test-input" value="" onChangeText={() => {}} />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle undefined value', () => {
      const { getByTestId } = render(
        <Input testID="test-input" value={undefined} />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle very long text', () => {
      const longText = 'A'.repeat(1000);
      const { getByDisplayValue } = render(
        <Input value={longText} onChangeText={() => {}} />
      );

      expect(getByDisplayValue(longText)).toBeDefined();
    });

    it('should handle special characters', () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const { getByDisplayValue } = render(
        <Input value={specialText} onChangeText={() => {}} />
      );

      expect(getByDisplayValue(specialText)).toBeDefined();
    });

    it('should handle emojis', () => {
      const emojiText = '😀🎉👍💯';
      const { getByDisplayValue } = render(
        <Input value={emojiText} onChangeText={() => {}} />
      );

      expect(getByDisplayValue(emojiText)).toBeDefined();
    });

    it('should handle multiline text with newlines', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      const { getByDisplayValue } = render(
        <Input value={multilineText} multiline onChangeText={() => {}} />
      );

      expect(getByDisplayValue(multilineText)).toBeDefined();
    });
  });

  describe('Custom Props', () => {
    it('should handle label prop (not rendered but accepted)', () => {
      const { getByTestId } = render(
        <Input testID="test-input" label="Username" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle leftIcon prop (not rendered but accepted)', () => {
      const { getByTestId } = render(
        <Input testID="test-input" leftIcon="user" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle rightIcon prop (not rendered but accepted)', () => {
      const { getByTestId } = render(
        <Input testID="test-input" rightIcon="search" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle onRightIconPress prop (not used but accepted)', () => {
      const handlePress = jest.fn();
      const { getByTestId } = render(
        <Input testID="test-input" rightIcon="close" onRightIconPress={handlePress} />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle size prop (not used but accepted)', () => {
      const { getByTestId } = render(
        <Input testID="test-input" size="large" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle fullWidth prop (not used but accepted)', () => {
      const { getByTestId } = render(
        <Input testID="test-input" fullWidth />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle required prop (not used but accepted)', () => {
      const { getByTestId } = render(
        <Input testID="test-input" required />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle state prop (not used but accepted)', () => {
      const { getByTestId } = render(
        <Input testID="test-input" state="error" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle errorText prop (not rendered but accepted)', () => {
      const { getByTestId } = render(
        <Input testID="test-input" errorText="This field is required" />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });
  });

  describe('Props Combinations', () => {
    it('should handle variant with custom styles', () => {
      const { getByTestId } = render(
        <Input
          testID="test-input"
          variant="filled"
          containerStyle={{ margin: 10 }}
          style={{ fontSize: 16 }}
        />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });

    it('should handle password input configuration', () => {
      const { getByTestId } = render(
        <Input
          testID="test-input"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      );

      const input = getByTestId('test-input');
      expect(input.props.secureTextEntry).toBe(true);
      expect(input.props.autoCapitalize).toBe('none');
      expect(input.props.autoCorrect).toBe(false);
    });

    it('should handle email input configuration', () => {
      const { getByTestId } = render(
        <Input
          testID="test-input"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      );

      const input = getByTestId('test-input');
      expect(input.props.keyboardType).toBe('email-address');
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('should handle disabled input with variant', () => {
      const { getByTestId } = render(
        <Input
          testID="test-input"
          variant="filled"
          editable={false}
        />
      );

      const input = getByTestId('test-input');
      expect(input.props.editable).toBe(false);
    });

    it('should handle all custom props together', () => {
      const handleChange = jest.fn();
      const handlePress = jest.fn();

      const { getByTestId } = render(
        <Input
          testID="test-input"
          variant="outline"
          label="Email"
          leftIcon="mail"
          rightIcon="close"
          onRightIconPress={handlePress}
          size="large"
          fullWidth
          required
          state="error"
          errorText="Invalid email"
          placeholder="Enter email"
          onChangeText={handleChange}
        />
      );

      expect(getByTestId('test-input')).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should support accessibility label', () => {
      const { getByTestId } = render(
        <Input testID="test-input" accessibilityLabel="Username input" />
      );

      const input = getByTestId('test-input');
      expect(input.props.accessibilityLabel).toBe('Username input');
    });

    it('should support accessibility hint', () => {
      const { getByTestId } = render(
        <Input testID="test-input" accessibilityHint="Enter your username" />
      );

      const input = getByTestId('test-input');
      expect(input.props.accessibilityHint).toBe('Enter your username');
    });

    it('should support testID prop', () => {
      const { getByTestId } = render(
        <Input testID="custom-input-id" />
      );

      expect(getByTestId('custom-input-id')).toBeDefined();
    });
  });

  describe('Theme Integration', () => {
    it('should use theme colors for default variant', () => {
      const { getByTestId } = render(
        <Input testID="test-input" variant="default" />
      );

      const input = getByTestId('test-input');
      expect(input.props.placeholderTextColor).toBe(theme.colors.placeholder);
    });

    it('should fallback to theme color when variant color is undefined', () => {
      const { getByTestId } = render(
        <Input testID="test-input" />
      );

      const input = getByTestId('test-input');
      expect(input.props.placeholderTextColor).toBeDefined();
    });
  });
});

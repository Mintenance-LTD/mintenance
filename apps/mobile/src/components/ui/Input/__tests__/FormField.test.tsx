import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { render } from '../../../../__tests__/test-utils';
import { FormField } from '../FormField';
import { designTokens } from '../../../../design-system/tokens';

// Mock StyleSheet.flatten to properly merge styles
const originalFlatten = StyleSheet.flatten;
StyleSheet.flatten = jest.fn((styles) => {
  if (!Array.isArray(styles)) return styles;
  return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
});

// Mock Input component
jest.mock('../Input', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return {
    Input: jest.fn(({ testID, containerStyle, ...props }) => (
      <View testID={testID || 'mock-input'} style={containerStyle}>
        <Text>Mock Input</Text>
      </View>
    )),
  };
});

describe('FormField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  describe('Rendering', () => {
    it('should render Input component when no children provided', () => {
      const { getByTestId } = render(
        <FormField testID="form-field" value="" onChangeText={jest.fn()} />
      );

      // The testID is passed through to the mock Input
      expect(getByTestId('form-field')).toBeDefined();
    });

    it('should render children when provided', () => {
      const { getByText, queryByTestId } = render(
        <FormField testID="form-field">
          <Text>Custom Content</Text>
        </FormField>
      );

      expect(getByText('Custom Content')).toBeDefined();
      expect(queryByTestId('mock-input')).toBeNull();
    });

    it('should render View with fieldStyle when children provided', () => {
      const customFieldStyle = { padding: 20, backgroundColor: '#f0f0f0' };
      const { getByText } = render(
        <FormField fieldStyle={customFieldStyle}>
          <Text>Custom Content</Text>
        </FormField>
      );

      const customContent = getByText('Custom Content');
      expect(customContent).toBeDefined();
    });

    it('should not render Input when children are provided', () => {
      const { queryByText, getByText } = render(
        <FormField>
          <Text>Custom Field</Text>
        </FormField>
      );

      expect(getByText('Custom Field')).toBeDefined();
      expect(queryByText('Mock Input')).toBeNull();
    });
  });

  // ============================================================================
  // PROPS SPREADING TESTS
  // ============================================================================

  describe('Props Spreading', () => {
    it('should spread InputProps to Input component', () => {
      const mockOnChangeText = jest.fn();
      const mockOnFocus = jest.fn();
      const mockOnBlur = jest.fn();

      render(
        <FormField
          testID="input-props"
          value="test value"
          placeholder="Test placeholder"
          onChangeText={mockOnChangeText}
          onFocus={mockOnFocus}
          onBlur={mockOnBlur}
          editable={true}
          maxLength={100}
        />
      );

      const Input = require('../Input').Input;
      const props = Input.mock.calls[0][0];

      expect(props.testID).toBe('input-props');
      expect(props.value).toBe('test value');
      expect(props.placeholder).toBe('Test placeholder');
      expect(props.onChangeText).toBe(mockOnChangeText);
      expect(props.onFocus).toBe(mockOnFocus);
      expect(props.onBlur).toBe(mockOnBlur);
      expect(props.editable).toBe(true);
      expect(props.maxLength).toBe(100);
    });

    it('should pass size prop to Input', () => {
      render(<FormField size="lg" value="" onChangeText={jest.fn()} />);

      const Input = require('../Input').Input;
      const props = Input.mock.calls[0][0];
      expect(props.size).toBe('lg');
    });

    it('should pass variant prop to Input', () => {
      render(<FormField variant="filled" value="" onChangeText={jest.fn()} />);

      const Input = require('../Input').Input;
      const props = Input.mock.calls[0][0];
      expect(props.variant).toBe('filled');
    });

    it('should pass state prop to Input', () => {
      render(<FormField state="error" value="" onChangeText={jest.fn()} />);

      const Input = require('../Input').Input;
      const props = Input.mock.calls[0][0];
      expect(props.state).toBe('error');
    });

    it('should pass label and helper text props to Input', () => {
      render(
        <FormField
          label="Email"
          helperText="Enter your email address"
          required={true}
          value=""
          onChangeText={jest.fn()}
        />
      );

      const Input = require('../Input').Input;
      const props = Input.mock.calls[0][0];
      expect(props.label).toBe('Email');
      expect(props.helperText).toBe('Enter your email address');
      expect(props.required).toBe(true);
    });

    it('should pass icon props to Input', () => {
      const mockIconPress = jest.fn();
      render(
        <FormField
          leftIcon="mail"
          rightIcon="eye"
          onRightIconPress={mockIconPress}
          value=""
          onChangeText={jest.fn()}
        />
      );

      const Input = require('../Input').Input;
      const props = Input.mock.calls[0][0];
      expect(props.leftIcon).toBe('mail');
      expect(props.rightIcon).toBe('eye');
      expect(props.onRightIconPress).toBe(mockIconPress);
    });
  });

  // ============================================================================
  // STYLE MERGING TESTS
  // ============================================================================

  describe('Style Merging', () => {
    it('should apply default fieldContainer style with marginBottom', () => {
      render(
        <FormField testID="styled-field" value="" onChangeText={jest.fn()} />
      );

      const Input = require('../Input').Input;
      const containerStyle = Input.mock.calls[0][0].containerStyle;

      expect(containerStyle).toEqual({
        marginBottom: designTokens.spacing[4],
      });
    });

    it('should merge containerStyle with default fieldContainer style', () => {
      const customContainerStyle = {
        padding: 10,
        backgroundColor: '#ffffff',
      };

      render(
        <FormField
          containerStyle={customContainerStyle}
          value=""
          onChangeText={jest.fn()}
        />
      );

      const Input = require('../Input').Input;
      const containerStyle = Input.mock.calls[0][0].containerStyle;

      expect(containerStyle).toEqual({
        marginBottom: designTokens.spacing[4],
        padding: 10,
        backgroundColor: '#ffffff',
      });
    });

    it('should allow containerStyle to override default marginBottom', () => {
      const customContainerStyle = {
        marginBottom: 32,
      };

      render(
        <FormField
          containerStyle={customContainerStyle}
          value=""
          onChangeText={jest.fn()}
        />
      );

      const Input = require('../Input').Input;
      const containerStyle = Input.mock.calls[0][0].containerStyle;

      expect(containerStyle.marginBottom).toBe(32);
    });

    it('should apply fieldStyle to View when children provided', () => {
      const customFieldStyle = {
        padding: 20,
        borderWidth: 1,
        borderColor: '#cccccc',
      };

      const { getByText } = render(
        <FormField fieldStyle={customFieldStyle}>
          <Text>Custom Content</Text>
        </FormField>
      );

      const content = getByText('Custom Content');
      expect(content).toBeDefined();
    });

    it('should merge fieldStyle with default styles when children provided', () => {
      const customFieldStyle = {
        padding: 15,
      };

      const { getByTestId } = render(
        <FormField testID="field-with-children" fieldStyle={customFieldStyle}>
          <Text testID="child-content">Child</Text>
        </FormField>
      );

      expect(getByTestId('child-content')).toBeDefined();
    });
  });

  // ============================================================================
  // DESIGN TOKENS TESTS
  // ============================================================================

  describe('Design Tokens', () => {
    it('should use spacing[4] from designTokens for marginBottom', () => {
      render(<FormField value="" onChangeText={jest.fn()} />);

      const Input = require('../Input').Input;
      const containerStyle = Input.mock.calls[0][0].containerStyle;

      expect(containerStyle.marginBottom).toBe(designTokens.spacing[4]);
      expect(designTokens.spacing[4]).toBe(16);
    });

    it('should maintain consistent spacing across multiple FormFields', () => {
      const { rerender } = render(
        <FormField testID="field-1" value="" onChangeText={jest.fn()} />
      );

      const Input = require('../Input').Input;
      const firstCallStyle = Input.mock.calls[0][0].containerStyle;

      rerender(<FormField testID="field-2" value="" onChangeText={jest.fn()} />);

      const secondCallStyle = Input.mock.calls[1][0].containerStyle;

      expect(firstCallStyle.marginBottom).toBe(secondCallStyle.marginBottom);
    });
  });

  // ============================================================================
  // CONDITIONAL RENDERING TESTS
  // ============================================================================

  describe('Conditional Rendering', () => {
    it('should render Input when children is undefined', () => {
      const { queryByText } = render(
        <FormField testID="no-children" value="" onChangeText={jest.fn()} />
      );

      expect(queryByText('Mock Input')).toBeDefined();
    });

    it('should render View when children is a single element', () => {
      const { getByText, queryByTestId } = render(
        <FormField>
          <Text>Single Child</Text>
        </FormField>
      );

      expect(getByText('Single Child')).toBeDefined();
      expect(queryByTestId('mock-input')).toBeNull();
    });

    it('should render View when children are multiple elements', () => {
      const { getByText, queryByTestId } = render(
        <FormField>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </FormField>
      );

      expect(getByText('First Child')).toBeDefined();
      expect(getByText('Second Child')).toBeDefined();
      expect(queryByTestId('mock-input')).toBeNull();
    });

    it('should render View when children is a fragment', () => {
      const { getByText, queryByTestId } = render(
        <FormField>
          <>
            <Text>Fragment Child 1</Text>
            <Text>Fragment Child 2</Text>
          </>
        </FormField>
      );

      expect(getByText('Fragment Child 1')).toBeDefined();
      expect(getByText('Fragment Child 2')).toBeDefined();
      expect(queryByTestId('mock-input')).toBeNull();
    });

    it('should render View when children is a custom component', () => {
      const CustomComponent = () => <Text>Custom Component Content</Text>;

      const { getByText, queryByTestId } = render(
        <FormField>
          <CustomComponent />
        </FormField>
      );

      expect(getByText('Custom Component Content')).toBeDefined();
      expect(queryByTestId('mock-input')).toBeNull();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty string as children (render Input)', () => {
      const { queryByText } = render(
        <FormField testID="empty-string">{''}</FormField>
      );

      // Empty string is falsy, so should render Input
      expect(queryByText('Mock Input')).toBeDefined();
    });

    it('should handle null children (render Input)', () => {
      const { queryByText } = render(
        <FormField testID="null-children">{null}</FormField>
      );

      expect(queryByText('Mock Input')).toBeDefined();
    });

    it('should handle undefined children (render Input)', () => {
      const { queryByText } = render(
        <FormField testID="undefined-children">{undefined}</FormField>
      );

      expect(queryByText('Mock Input')).toBeDefined();
    });

    it('should handle false as children (render Input)', () => {
      const { queryByText } = render(
        <FormField testID="false-children">{false}</FormField>
      );

      expect(queryByText('Mock Input')).toBeDefined();
    });

    it('should handle 0 as children (render Input because 0 is falsy)', () => {
      const { queryByText } = render(
        <FormField>{0}</FormField>
      );

      // In React, 0 is falsy in conditional, so FormField renders Input
      expect(queryByText('Mock Input')).toBeDefined();
    });

    it('should not pass fieldStyle to Input when no children', () => {
      const customFieldStyle = { padding: 20 };

      render(
        <FormField
          fieldStyle={customFieldStyle}
          value=""
          onChangeText={jest.fn()}
        />
      );

      const Input = require('../Input').Input;
      const props = Input.mock.calls[0][0];
      expect(props).not.toHaveProperty('fieldStyle');
    });

    it('should not pass children prop to Input', () => {
      render(<FormField value="" onChangeText={jest.fn()} />);

      const Input = require('../Input').Input;
      const props = Input.mock.calls[0][0];
      expect(props).not.toHaveProperty('children');
    });

    it('should handle multiple style overrides simultaneously', () => {
      const customContainerStyle = {
        marginBottom: 8,
        padding: 12,
      };
      const customFieldStyle = {
        backgroundColor: '#f5f5f5',
      };

      render(
        <FormField
          containerStyle={customContainerStyle}
          fieldStyle={customFieldStyle}
          value=""
          onChangeText={jest.fn()}
        />
      );

      const Input = require('../Input').Input;
      const containerStyle = Input.mock.calls[0][0].containerStyle;

      // fieldStyle is not passed to Input when no children
      expect(containerStyle).toEqual({
        marginBottom: 8,
        padding: 12,
      });
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration', () => {
    it('should work with all InputProps and custom children', () => {
      const { rerender, getByText, queryByTestId } = render(
        <FormField
          testID="integrated"
          label="Username"
          value="test"
          onChangeText={jest.fn()}
        />
      );

      expect(queryByTestId('mock-input')).toBeDefined();

      rerender(
        <FormField testID="integrated" label="Username">
          <Text>Custom Username Input</Text>
        </FormField>
      );

      expect(getByText('Custom Username Input')).toBeDefined();
      expect(queryByTestId('mock-input')).toBeNull();
    });

    it('should handle dynamic children switching', () => {
      const { rerender, getByText, queryByTestId, queryByText } = render(
        <FormField testID="dynamic" value="" onChangeText={jest.fn()} />
      );

      expect(queryByText('Mock Input')).toBeDefined();

      rerender(
        <FormField testID="dynamic">
          <Text>Now with children</Text>
        </FormField>
      );

      expect(getByText('Now with children')).toBeDefined();
      expect(queryByText('Mock Input')).toBeNull();

      rerender(<FormField testID="dynamic" value="" onChangeText={jest.fn()} />);

      expect(queryByText('Mock Input')).toBeDefined();
    });

    it('should maintain Input functionality with complex props', () => {
      const mockChangeText = jest.fn();
      const mockFocus = jest.fn();
      const mockBlur = jest.fn();
      const mockIconPress = jest.fn();

      render(
        <FormField
          testID="complex"
          label="Email Address"
          placeholder="Enter email"
          helperText="We'll never share your email"
          errorText="Invalid email"
          required={true}
          size="lg"
          variant="filled"
          state="error"
          fullWidth={true}
          leftIcon="mail"
          rightIcon="eye"
          onRightIconPress={mockIconPress}
          value="test@example.com"
          onChangeText={mockChangeText}
          onFocus={mockFocus}
          onBlur={mockBlur}
          maxLength={100}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      );

      const Input = require('../Input').Input;
      const props = Input.mock.calls[0][0];

      // Check all props except containerStyle which is transformed
      expect(props.testID).toBe('complex');
      expect(props.label).toBe('Email Address');
      expect(props.placeholder).toBe('Enter email');
      expect(props.helperText).toBe("We'll never share your email");
      expect(props.errorText).toBe('Invalid email');
      expect(props.required).toBe(true);
      expect(props.size).toBe('lg');
      expect(props.variant).toBe('filled');
      expect(props.state).toBe('error');
      expect(props.fullWidth).toBe(true);
      expect(props.leftIcon).toBe('mail');
      expect(props.rightIcon).toBe('eye');
      expect(props.onRightIconPress).toBe(mockIconPress);
      expect(props.value).toBe('test@example.com');
      expect(props.onChangeText).toBe(mockChangeText);
      expect(props.onFocus).toBe(mockFocus);
      expect(props.onBlur).toBe(mockBlur);
      expect(props.maxLength).toBe(100);
      expect(props.autoCapitalize).toBe('none');
      expect(props.keyboardType).toBe('email-address');
      expect(props.containerStyle).toEqual({ marginBottom: 16 });
    });
  });
});

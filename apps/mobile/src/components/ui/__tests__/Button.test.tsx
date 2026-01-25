import React from 'react';
import { render, fireEvent } from '../../../__tests__/test-utils';
import { Text as RNText } from 'react-native';
import { Button } from '../Button';
import type { ButtonProps } from '../Button';

// ============================================================================
// MOCKS
// ============================================================================

// Mock theme to avoid circular dependencies
jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      primary: '#0EA5E9',
      secondary: '#10B981',
      error: '#EF4444',
      info: '#3B82F6',
      textInverse: '#FFFFFF',
      textTertiary: '#9CA3AF',
    },
    components: {
      button: {
        primary: {
          backgroundColor: '#0EA5E9',
          color: '#FFFFFF',
          borderColor: '#0EA5E9',
        },
        secondary: {
          backgroundColor: 'transparent',
          color: '#0EA5E9',
          borderColor: '#0EA5E9',
        },
        tertiary: {
          backgroundColor: 'transparent',
          color: '#3B82F6',
          borderColor: 'transparent',
        },
        success: {
          backgroundColor: '#10B981',
          color: '#FFFFFF',
          borderColor: '#10B981',
        },
        danger: {
          backgroundColor: '#EF4444',
          color: '#FFFFFF',
          borderColor: '#EF4444',
        },
        ghost: {
          backgroundColor: 'transparent',
          color: '#0EA5E9',
          borderColor: 'transparent',
        },
      },
    },
    layout: {
      buttonHeightLarge: 48,
      minTouchTarget: 44,
    },
    spacing: {
      1: 4,
      2: 8,
      4: 16,
    },
    borderRadius: {
      base: 8,
      xl: 16,
      full: 9999,
    },
    shadows: {
      lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    },
    typography: {
      fontSize: {
        lg: 18,
      },
      fontWeight: {
        semibold: '600',
        medium: '500',
      },
    },
  },
}));

// ============================================================================
// TEST HELPERS
// ============================================================================

const TestIcon = () => <RNText testID="test-icon">★</RNText>;

// Helper to get style values from component
const getStyleValue = (element: any, property: string) => {
  const styles = Array.isArray(element?.props?.style)
    ? element.props.style.flat()
    : [element?.props?.style];

  for (const style of styles) {
    if (style && style[property] !== undefined) {
      return style[property];
    }
  }
  return undefined;
};

// ============================================================================
// BUTTON COMPONENT TESTS
// ============================================================================

describe('Button Component', () => {
  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------

  describe('Rendering', () => {
    it('renders with title text', () => {
      const { getByText } = render(<Button title="Test Button" />);
      expect(getByText('Test Button')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const { getByTestId } = render(
        <Button title="Test" testID="custom-button" />
      );
      expect(getByTestId('custom-button')).toBeTruthy();
    });

    it('renders as TouchableOpacity', () => {
      const { getByText } = render(<Button title="Button" />);
      const button = getByText('Button').parent?.parent;
      expect(button?.type).toBe('TouchableOpacity');
    });
  });

  // --------------------------------------------------------------------------
  // Variant Tests
  // --------------------------------------------------------------------------

  describe('Variants', () => {
    it('renders primary variant by default', () => {
      const { getByTestId } = render(
        <Button title="Primary" testID="primary-btn" />
      );
      const button = getByTestId('primary-btn');
      const bgColor = getStyleValue(button, 'backgroundColor');
      expect(bgColor).toBe('#0EA5E9');
    });

    it('renders primary variant explicitly', () => {
      const { getByTestId } = render(
        <Button title="Primary" variant="primary" testID="primary-btn" />
      );
      const button = getByTestId('primary-btn');
      const bgColor = getStyleValue(button, 'backgroundColor');
      expect(bgColor).toBe('#0EA5E9');
    });

    it('renders secondary variant', () => {
      const { getByTestId } = render(
        <Button title="Secondary" variant="secondary" testID="secondary-btn" />
      );
      const button = getByTestId('secondary-btn');
      const bgColor = getStyleValue(button, 'backgroundColor');
      expect(bgColor).toBe('transparent');
    });

    it('renders tertiary variant', () => {
      const { getByTestId } = render(
        <Button title="Tertiary" variant="tertiary" testID="tertiary-btn" />
      );
      const button = getByTestId('tertiary-btn');
      const bgColor = getStyleValue(button, 'backgroundColor');
      expect(bgColor).toBe('transparent');
    });

    it('renders success variant', () => {
      const { getByTestId } = render(
        <Button title="Success" variant="success" testID="success-btn" />
      );
      const button = getByTestId('success-btn');
      const bgColor = getStyleValue(button, 'backgroundColor');
      expect(bgColor).toBe('#10B981');
    });

    it('renders danger variant', () => {
      const { getByTestId } = render(
        <Button title="Danger" variant="danger" testID="danger-btn" />
      );
      const button = getByTestId('danger-btn');
      const bgColor = getStyleValue(button, 'backgroundColor');
      expect(bgColor).toBe('#EF4444');
    });

    it('renders ghost variant', () => {
      const { getByTestId } = render(
        <Button title="Ghost" variant="ghost" testID="ghost-btn" />
      );
      const button = getByTestId('ghost-btn');
      const bgColor = getStyleValue(button, 'backgroundColor');
      expect(bgColor).toBe('transparent');
    });

    it('applies correct text color for primary variant', () => {
      const { getByText } = render(
        <Button title="Primary" variant="primary" />
      );
      const text = getByText('Primary');
      const color = getStyleValue(text, 'color');
      expect(color).toBe('#FFFFFF');
    });

    it('applies correct text color for secondary variant', () => {
      const { getByText } = render(
        <Button title="Secondary" variant="secondary" />
      );
      const text = getByText('Secondary');
      const color = getStyleValue(text, 'color');
      expect(color).toBe('#0EA5E9');
    });

    it('applies correct border color for primary variant', () => {
      const { getByTestId } = render(
        <Button title="Primary" variant="primary" testID="primary-btn" />
      );
      const button = getByTestId('primary-btn');
      const borderColor = getStyleValue(button, 'borderColor');
      expect(borderColor).toBe('#0EA5E9');
    });

    it('applies correct border color for secondary variant', () => {
      const { getByTestId } = render(
        <Button title="Secondary" variant="secondary" testID="secondary-btn" />
      );
      const button = getByTestId('secondary-btn');
      const borderColor = getStyleValue(button, 'borderColor');
      expect(borderColor).toBe('#0EA5E9');
    });

    it('applies transparent border for tertiary variant', () => {
      const { getByTestId } = render(
        <Button title="Tertiary" variant="tertiary" testID="tertiary-btn" />
      );
      const button = getByTestId('tertiary-btn');
      const borderColor = getStyleValue(button, 'borderColor');
      expect(borderColor).toBe('transparent');
    });

    it('applies underline text decoration for tertiary variant', () => {
      const { getByText } = render(
        <Button title="Tertiary" variant="tertiary" />
      );
      const text = getByText('Tertiary');
      const textDecoration = getStyleValue(text, 'textDecorationLine');
      expect(textDecoration).toBe('underline');
    });
  });

  // --------------------------------------------------------------------------
  // Size Tests
  // --------------------------------------------------------------------------

  describe('Sizes', () => {
    it('renders medium size by default', () => {
      const { getByTestId } = render(
        <Button title="Default Size" testID="default-btn" />
      );
      const button = getByTestId('default-btn');
      const minHeight = getStyleValue(button, 'minHeight');
      expect(minHeight).toBe(48);
    });

    it('renders medium size explicitly', () => {
      const { getByTestId } = render(
        <Button title="Medium" size="md" testID="md-btn" />
      );
      const button = getByTestId('md-btn');
      const minHeight = getStyleValue(button, 'minHeight');
      expect(minHeight).toBe(48);
    });

    it('renders small size', () => {
      const { getByTestId } = render(
        <Button title="Small" size="sm" testID="sm-btn" />
      );
      const button = getByTestId('sm-btn');
      const minHeight = getStyleValue(button, 'minHeight');
      expect(minHeight).toBe(44);
    });

    it('applies correct padding for medium size', () => {
      const { getByTestId } = render(
        <Button title="Medium" size="md" testID="md-btn" />
      );
      const button = getByTestId('md-btn');
      const paddingHorizontal = getStyleValue(button, 'paddingHorizontal');
      expect(paddingHorizontal).toBe(16);
    });

    it('applies correct padding for small size', () => {
      const { getByTestId } = render(
        <Button title="Small" size="sm" testID="sm-btn" />
      );
      const button = getByTestId('sm-btn');
      const paddingHorizontal = getStyleValue(button, 'paddingHorizontal');
      expect(paddingHorizontal).toBe(8);
    });

    it('applies correct border radius for medium size', () => {
      const { getByTestId } = render(
        <Button title="Medium" size="md" testID="md-btn" />
      );
      const button = getByTestId('md-btn');
      const borderRadius = getStyleValue(button, 'borderRadius');
      expect(borderRadius).toBe(16);
    });

    it('applies correct border radius for small size', () => {
      const { getByTestId } = render(
        <Button title="Small" size="sm" testID="sm-btn" />
      );
      const button = getByTestId('sm-btn');
      const borderRadius = getStyleValue(button, 'borderRadius');
      expect(borderRadius).toBe(8);
    });
  });

  // --------------------------------------------------------------------------
  // Disabled State Tests
  // --------------------------------------------------------------------------

  describe('Disabled State', () => {
    it('is not disabled by default', () => {
      const { getByTestId } = render(
        <Button title="Enabled" testID="enabled-btn" />
      );
      const button = getByTestId('enabled-btn');
      expect(button.props.disabled).toBeFalsy();
    });

    it('can be disabled', () => {
      const { getByTestId } = render(
        <Button title="Disabled" disabled testID="disabled-btn" />
      );
      const button = getByTestId('disabled-btn');
      expect(button.props.disabled).toBe(true);
    });

    it('applies disabled background color', () => {
      const { getByTestId } = render(
        <Button title="Disabled" disabled testID="disabled-btn" />
      );
      const button = getByTestId('disabled-btn');
      const bgColor = getStyleValue(button, 'backgroundColor');
      expect(bgColor).toBe('#9CA3AF'); // Disabled gray color
    });

    it('removes shadow when disabled', () => {
      const { getByTestId } = render(
        <Button title="Disabled" disabled testID="disabled-btn" />
      );
      const button = getByTestId('disabled-btn');
      const shadowOpacity = getStyleValue(button, 'shadowOpacity');
      const elevation = getStyleValue(button, 'elevation');
      expect(shadowOpacity === 0 || shadowOpacity === undefined).toBe(true);
      expect(elevation === 0 || elevation === undefined).toBe(true);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button title="Disabled" disabled onPress={onPress} />
      );
      fireEvent.press(getByText('Disabled'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('sets accessibility state to disabled', () => {
      const { getByTestId } = render(
        <Button title="Disabled" disabled testID="disabled-btn" />
      );
      const button = getByTestId('disabled-btn');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Loading State Tests
  // --------------------------------------------------------------------------

  describe('Loading State', () => {
    it('is not loading by default', () => {
      const { queryByTestId } = render(<Button title="Not Loading" />);
      expect(queryByTestId('activity-indicator')).toBeNull();
    });

    it('shows ActivityIndicator when loading', () => {
      const { UNSAFE_getByType } = render(
        <Button title="Loading" loading />
      );
      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('hides title text when loading', () => {
      const { queryByText } = render(
        <Button title="Hidden" loading />
      );
      expect(queryByText('Hidden')).toBeNull();
    });

    it('disables button when loading', () => {
      const { getByTestId } = render(
        <Button title="Loading" loading testID="loading-btn" />
      );
      const button = getByTestId('loading-btn');
      expect(button.props.disabled).toBe(true);
    });

    it('does not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button title="Loading" loading onPress={onPress} testID="loading-btn" />
      );
      fireEvent.press(getByTestId('loading-btn'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('sets accessibility state to busy when loading', () => {
      const { getByTestId } = render(
        <Button title="Loading" loading testID="loading-btn" />
      );
      const button = getByTestId('loading-btn');
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('sets accessibility state to disabled when loading', () => {
      const { getByTestId } = render(
        <Button title="Loading" loading testID="loading-btn" />
      );
      const button = getByTestId('loading-btn');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Press Handling Tests
  // --------------------------------------------------------------------------

  describe('Press Handling', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button title="Press Me" onPress={onPress} />
      );
      fireEvent.press(getByText('Press Me'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('can be pressed multiple times', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button title="Press Multiple" onPress={onPress} />
      );
      const button = getByText('Press Multiple');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledTimes(3);
    });

    it('works without onPress handler', () => {
      const { getByText } = render(<Button title="No Handler" />);
      expect(() => fireEvent.press(getByText('No Handler'))).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Icon Tests
  // --------------------------------------------------------------------------

  describe('Icon', () => {
    it('renders without icon by default', () => {
      const { queryByTestId } = render(<Button title="No Icon" />);
      expect(queryByTestId('test-icon')).toBeNull();
    });

    it('renders with icon', () => {
      const { getByTestId } = render(
        <Button title="With Icon" icon={<TestIcon />} />
      );
      expect(getByTestId('test-icon')).toBeTruthy();
    });

    it('positions icon on left by default', () => {
      const { getByText, getByTestId } = render(
        <Button title="Text" icon={<TestIcon />} />
      );
      const content = getByText('Text').parent;
      const icon = getByTestId('test-icon');
      expect(content?.props.children[0]).toBeTruthy();
      expect(icon).toBeTruthy();
    });

    it('positions icon on left explicitly', () => {
      const { getByText, getByTestId } = render(
        <Button title="Text" icon={<TestIcon />} iconPosition="left" />
      );
      const content = getByText('Text').parent;
      const icon = getByTestId('test-icon');
      expect(content?.props.children[0]).toBeTruthy();
      expect(icon).toBeTruthy();
    });

    it('positions icon on right', () => {
      const { getByText, getByTestId } = render(
        <Button title="Text" icon={<TestIcon />} iconPosition="right" />
      );
      const content = getByText('Text').parent;
      const icon = getByTestId('test-icon');
      expect(content?.props.children[2]).toBeTruthy();
      expect(icon).toBeTruthy();
    });

    it('hides text when iconOnly is true', () => {
      const { queryByText, getByTestId } = render(
        <Button title="Hidden" icon={<TestIcon />} iconOnly />
      );
      expect(queryByText('Hidden')).toBeNull();
      expect(getByTestId('test-icon')).toBeTruthy();
    });

    it('applies circular shape for iconOnly button', () => {
      const { getByTestId } = render(
        <Button
          title="Icon Only"
          icon={<TestIcon />}
          iconOnly
          testID="icon-only-btn"
        />
      );
      const button = getByTestId('icon-only-btn');
      const borderRadius = getStyleValue(button, 'borderRadius');
      expect(borderRadius).toBe(9999); // theme.borderRadius.full
    });

    it('applies minimum touch target for iconOnly button', () => {
      const { getByTestId } = render(
        <Button
          title="Icon Only"
          icon={<TestIcon />}
          iconOnly
          testID="icon-only-btn"
        />
      );
      const button = getByTestId('icon-only-btn');
      const minHeight = getStyleValue(button, 'minHeight');
      const minWidth = getStyleValue(button, 'minWidth');
      expect(minHeight).toBe(44); // theme.layout.minTouchTarget
      expect(minWidth).toBe(44); // theme.layout.minTouchTarget
    });

    it('wraps icon in View when iconOnly', () => {
      const { getByTestId, UNSAFE_root } = render(
        <Button title="Icon Only" icon={<TestIcon />} iconOnly />
      );
      const icon = getByTestId('test-icon');
      // Icon is wrapped - verify parent chain exists
      expect(icon.parent).toBeTruthy();
      // Find View wrapper in parent chain
      let current = icon.parent;
      let foundView = false;
      while (current && !foundView) {
        const typeName = typeof current.type === 'string' ? current.type : current.type?.displayName || '';
        if (typeName.includes('View') || current.type === 'View' || typeName === 'View') {
          foundView = true;
        }
        current = current.parent;
      }
      expect(foundView).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Full Width Tests
  // --------------------------------------------------------------------------

  describe('Full Width', () => {
    it('is not full width by default', () => {
      const { getByTestId } = render(
        <Button title="Default Width" testID="default-btn" />
      );
      const button = getByTestId('default-btn');
      const width = getStyleValue(button, 'width');
      expect(width).toBeUndefined();
    });

    it('applies full width when fullWidth is true', () => {
      const { getByTestId } = render(
        <Button title="Full Width" fullWidth testID="full-width-btn" />
      );
      const button = getByTestId('full-width-btn');
      const width = getStyleValue(button, 'width');
      expect(width).toBe('100%');
    });

    it('can be not full width explicitly', () => {
      const { getByTestId } = render(
        <Button title="Not Full" fullWidth={false} testID="not-full-btn" />
      );
      const button = getByTestId('not-full-btn');
      const width = getStyleValue(button, 'width');
      expect(width).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has button role', () => {
      const { getByTestId } = render(<Button title="Button" testID="btn" />);
      const button = getByTestId('btn');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('uses title as accessibility label by default', () => {
      const { getByLabelText } = render(<Button title="Test Label" />);
      expect(getByLabelText('Test Label')).toBeTruthy();
    });

    it('uses custom accessibility label', () => {
      const { getByLabelText } = render(
        <Button title="Button" accessibilityLabel="Custom Label" />
      );
      expect(getByLabelText('Custom Label')).toBeTruthy();
    });

    it('sets default accessibility state', () => {
      const { getByTestId } = render(
        <Button title="Button" testID="button" />
      );
      const button = getByTestId('button');
      expect(button.props.accessibilityState).toEqual({
        disabled: false,
        busy: false,
      });
    });

    it('sets custom accessibility state', () => {
      const { getByTestId } = render(
        <Button
          title="Button"
          testID="button"
          accessibilityState={{ selected: true }}
        />
      );
      const button = getByTestId('button');
      expect(button.props.accessibilityState).toEqual({ selected: true });
    });

    it('merges custom accessibility state with disabled', () => {
      const { getByTestId } = render(
        <Button
          title="Button"
          testID="button"
          disabled
          accessibilityState={{ checked: true }}
        />
      );
      const button = getByTestId('button');
      expect(button.props.accessibilityState.checked).toBe(true);
    });

    it('merges custom accessibility state with loading', () => {
      const { getByTestId } = render(
        <Button
          title="Button"
          testID="button"
          loading
          accessibilityState={{ expanded: true }}
        />
      );
      const button = getByTestId('button');
      expect(button.props.accessibilityState.expanded).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Custom Style Tests
  // --------------------------------------------------------------------------

  describe('Custom Styles', () => {
    it('applies custom style to button', () => {
      const customStyle = { marginTop: 20, marginBottom: 10 };
      const { getByTestId } = render(
        <Button title="Styled" style={customStyle} testID="styled-btn" />
      );
      const button = getByTestId('styled-btn');
      const styles = Array.isArray(button.props.style)
        ? button.props.style.flat()
        : [button.props.style];
      expect(styles).toContainEqual(customStyle);
    });

    it('applies custom textStyle to text', () => {
      const customTextStyle = { letterSpacing: 2 };
      const { getByText } = render(
        <Button title="Styled Text" textStyle={customTextStyle} />
      );
      const text = getByText('Styled Text');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];
      expect(styles).toContainEqual(customTextStyle);
    });

    it('merges custom style with default styles', () => {
      const customStyle = { opacity: 0.8 };
      const { getByTestId } = render(
        <Button
          title="Merged"
          variant="primary"
          style={customStyle}
          testID="merged-btn"
        />
      );
      const button = getByTestId('merged-btn');
      const bgColor = getStyleValue(button, 'backgroundColor');
      const opacity = getStyleValue(button, 'opacity');
      expect(bgColor).toBe('#0EA5E9');
      expect(opacity).toBe(0.8);
    });

    it('handles array of styles', () => {
      const styles = [{ marginTop: 10 }, { marginBottom: 5 }];
      const { getByTestId } = render(
        <Button title="Array Styles" style={styles} testID="array-btn" />
      );
      const button = getByTestId('array-btn');
      const marginTop = getStyleValue(button, 'marginTop');
      const marginBottom = getStyleValue(button, 'marginBottom');
      expect(marginTop).toBe(10);
      expect(marginBottom).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // Shadow Tests
  // --------------------------------------------------------------------------

  describe('Shadows', () => {
    it('applies shadow by default', () => {
      const { getByTestId } = render(
        <Button title="Shadow" testID="shadow-btn" />
      );
      const button = getByTestId('shadow-btn');
      const shadowOpacity = getStyleValue(button, 'shadowOpacity');
      expect(shadowOpacity).toBeGreaterThan(0);
    });

    it('removes shadow for transparent background', () => {
      const { getByTestId } = render(
        <Button title="No Shadow" variant="ghost" testID="ghost-btn" />
      );
      const button = getByTestId('ghost-btn');
      const shadowOpacity = getStyleValue(button, 'shadowOpacity');
      const elevation = getStyleValue(button, 'elevation');
      expect(shadowOpacity === 0 || shadowOpacity === undefined).toBe(true);
      expect(elevation === 0 || elevation === undefined).toBe(true);
    });

    it('removes shadow when disabled', () => {
      const { getByTestId } = render(
        <Button title="Disabled" disabled testID="disabled-btn" />
      );
      const button = getByTestId('disabled-btn');
      const shadowOpacity = getStyleValue(button, 'shadowOpacity');
      const elevation = getStyleValue(button, 'elevation');
      expect(shadowOpacity === 0 || shadowOpacity === undefined).toBe(true);
      expect(elevation === 0 || elevation === undefined).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Combined State Tests
  // --------------------------------------------------------------------------

  describe('Combined States', () => {
    it('handles disabled and loading together', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button
          title="Disabled Loading"
          disabled
          loading
          onPress={onPress}
          testID="combined-btn"
        />
      );
      const button = getByTestId('combined-btn');
      expect(button.props.disabled).toBe(true);
      expect(button.props.accessibilityState.disabled).toBe(true);
      expect(button.props.accessibilityState.busy).toBe(true);
      fireEvent.press(button);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('handles fullWidth with iconOnly', () => {
      const { getByTestId } = render(
        <Button
          title="Full Icon"
          icon={<TestIcon />}
          iconOnly
          fullWidth
          testID="full-icon-btn"
        />
      );
      const button = getByTestId('full-icon-btn');
      const width = getStyleValue(button, 'width');
      const borderRadius = getStyleValue(button, 'borderRadius');
      expect(width).toBe('100%');
      expect(borderRadius).toBe(9999);
    });

    it('handles small size with icon', () => {
      const { getByTestId, getByText } = render(
        <Button
          title="Small Icon"
          size="sm"
          icon={<TestIcon />}
          testID="small-icon-btn"
        />
      );
      const button = getByTestId('small-icon-btn');
      const icon = getByTestId('test-icon');
      const minHeight = getStyleValue(button, 'minHeight');
      expect(minHeight).toBe(44);
      expect(icon).toBeTruthy();
      expect(getByText('Small Icon')).toBeTruthy();
    });

    it('handles all props together', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button
          title="All Props"
          variant="success"
          size="sm"
          icon={<TestIcon />}
          iconPosition="right"
          fullWidth
          onPress={onPress}
          style={{ marginTop: 10 }}
          textStyle={{ fontSize: 16 }}
          accessibilityLabel="Complete Button"
          testID="complete-btn"
        />
      );
      const button = getByTestId('complete-btn');
      const bgColor = getStyleValue(button, 'backgroundColor');
      const width = getStyleValue(button, 'width');
      const marginTop = getStyleValue(button, 'marginTop');

      expect(bgColor).toBe('#10B981');
      expect(width).toBe('100%');
      expect(marginTop).toBe(10);
      expect(button.props.accessibilityLabel).toBe('Complete Button');

      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles empty title', () => {
      const { getByTestId } = render(
        <Button title="" testID="empty-title-btn" />
      );
      expect(getByTestId('empty-title-btn')).toBeTruthy();
    });

    it('handles undefined onPress', () => {
      const { getByText } = render(
        <Button title="No Handler" onPress={undefined} />
      );
      expect(() => fireEvent.press(getByText('No Handler'))).not.toThrow();
    });

    it('handles null icon', () => {
      const { queryByTestId } = render(
        <Button title="Null Icon" icon={null as any} />
      );
      expect(queryByTestId('test-icon')).toBeNull();
    });

    it('handles undefined icon', () => {
      const { queryByTestId } = render(
        <Button title="Undefined Icon" icon={undefined} />
      );
      expect(queryByTestId('test-icon')).toBeNull();
    });

    it('renders with very long title', () => {
      const longTitle = 'This is a very long button title that might wrap to multiple lines';
      const { getByText } = render(<Button title={longTitle} />);
      expect(getByText(longTitle)).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Text Styling Tests
  // --------------------------------------------------------------------------

  describe('Text Styling', () => {
    it('applies default text styles', () => {
      const { getByText } = render(<Button title="Text" />);
      const text = getByText('Text');
      const fontSize = getStyleValue(text, 'fontSize');
      const fontWeight = getStyleValue(text, 'fontWeight');
      expect(fontSize).toBe(18);
      expect(fontWeight).toBe('600');
    });

    it('applies tertiary text styles', () => {
      const { getByText } = render(
        <Button title="Tertiary" variant="tertiary" />
      );
      const text = getByText('Tertiary');
      const textDecoration = getStyleValue(text, 'textDecorationLine');
      const fontWeight = getStyleValue(text, 'fontWeight');
      expect(textDecoration).toBe('underline');
      expect(fontWeight).toBe('500');
    });
  });

  // --------------------------------------------------------------------------
  // Layout Tests
  // --------------------------------------------------------------------------

  describe('Layout', () => {
    it('applies base layout styles', () => {
      const { getByTestId } = render(
        <Button title="Layout" testID="layout-btn" />
      );
      const button = getByTestId('layout-btn');
      const justifyContent = getStyleValue(button, 'justifyContent');
      const alignItems = getStyleValue(button, 'alignItems');
      const borderWidth = getStyleValue(button, 'borderWidth');
      expect(justifyContent).toBe('center');
      expect(alignItems).toBe('center');
      expect(borderWidth).toBe(1);
    });

    it('uses flexDirection row for content with icon', () => {
      const { getByText } = render(
        <Button title="Row" icon={<TestIcon />} />
      );
      const content = getByText('Row').parent;
      const flexDirection = getStyleValue(content, 'flexDirection');
      expect(flexDirection).toBe('row');
    });

    it('centers items in content row', () => {
      const { getByText } = render(
        <Button title="Centered" icon={<TestIcon />} />
      );
      const content = getByText('Centered').parent;
      const alignItems = getStyleValue(content, 'alignItems');
      expect(alignItems).toBe('center');
    });
  });
});

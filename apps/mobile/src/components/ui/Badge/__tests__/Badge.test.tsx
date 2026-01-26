import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Badge, Chip, NotificationBadge } from '../Badge';
import type { BadgeVariant, BadgeSize } from '../Badge';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, style, testID, ...props }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return (
      <Text
        testID={testID || `icon-${name}`}
        style={style}
        accessibilityLabel={`Icon: ${name}, size: ${size}, color: ${color}`}
        {...props}
      >
        {name}
      </Text>
    );
  },
  glyphMap: {
    'star': 'star',
    'heart': 'heart',
    'close': 'close',
    'checkmark': 'checkmark',
    'alert-circle': 'alert-circle',
  },
}));

jest.mock('../../../../design-system/tokens', () => ({
  designTokens: {
    colors: {
      primary: { 500: '#0EA5E9', 600: '#0284C7' },
      secondary: { 500: '#10B981', 600: '#059669' },
      success: { 500: '#22C55E', 600: '#16A34A' },
      error: { 500: '#EF4444', 600: '#DC2626' },
      warning: { 500: '#F59E0B', 600: '#D97706' },
      info: { 500: '#3B82F6', 600: '#2563EB' },
      neutral: { 0: '#FFFFFF', 100: '#F5F5F5', 200: '#E5E5E5', 900: '#171717' },
    },
    spacing: {
      0.5: 2,
      1: 4,
      1.5: 6,
      2: 8,
      3: 12,
      4: 16,
    },
    borderRadius: {
      lg: 12,
    },
    typography: {
      fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
      },
      fontWeight: {
        medium: '500',
      },
    },
    semanticColors: {
      text: {
        primary: '#171717',
        inverse: '#FFFFFF',
      },
      border: {
        primary: '#E5E5E5',
      },
    },
    shadows: {
      sm: {
        shadowColor: '#171717',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    },
  },
}));

// ============================================================================
// TEST HELPERS
// ============================================================================

// Helper to normalize styles (handles both arrays and objects)
const getStylesArray = (style: any) => {
  if (Array.isArray(style)) return style.flat();
  return [style];
};

// Helper to find element by accessibility role (handles RTN quirks)
const getByAccessibilityRole = (tree: any, role: string): any => {
  const queue = [tree];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node?.props?.accessibilityRole === role) {
      return node;
    }
    if (node?.children) {
      queue.push(...node.children);
    }
  }
  return null;
};

// ============================================================================
// BADGE COMPONENT TESTS
// ============================================================================

describe('Badge Component', () => {
  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------

  describe('Rendering', () => {
    it('renders with default props', () => {
      const { getByText } = render(<Badge>Test Badge</Badge>);
      expect(getByText('Test Badge')).toBeTruthy();
    });

    it('renders with string children', () => {
      const { getByText } = render(<Badge>Test</Badge>);
      expect(getByText('Test')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const { getByTestId } = render(<Badge testID="custom-badge">Test</Badge>);
      expect(getByTestId('custom-badge')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Variant Tests
  // --------------------------------------------------------------------------

  describe('Variants', () => {
    const variants: BadgeVariant[] = [
      'primary',
      'secondary',
      'success',
      'error',
      'warning',
      'info',
      'neutral',
    ];

    variants.forEach((variant) => {
      it(`renders ${variant} variant correctly`, () => {
        const { getByText } = render(
          <Badge variant={variant}>{variant} badge</Badge>
        );
        const badge = getByText(`${variant} badge`);
        expect(badge).toBeTruthy();
      });
    });

    it('applies correct background color for primary variant', () => {
      const { getByText } = render(<Badge variant="primary">Primary</Badge>);
      const badge = getByText('Primary').parent;
      const styles = Array.isArray(badge?.props.style) ? badge.props.style : [badge?.props.style];
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });

    it('applies correct background color for neutral variant', () => {
      const { getByText } = render(<Badge variant="neutral">Neutral</Badge>);
      const badge = getByText('Neutral').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#F5F5F5',
          }),
        ])
      );
    });

    it('applies correct text color for neutral variant', () => {
      const { getByText } = render(<Badge variant="neutral">Neutral</Badge>);
      const text = getByText('Neutral');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#171717',
          }),
        ])
      );
    });

    it('applies inverse text color for colored variants', () => {
      const { getByText } = render(<Badge variant="primary">Primary</Badge>);
      const text = getByText('Primary');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#FFFFFF',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Size Tests
  // --------------------------------------------------------------------------

  describe('Sizes', () => {
    const sizes: BadgeSize[] = ['sm', 'md', 'lg'];

    sizes.forEach((size) => {
      it(`renders ${size} size correctly`, () => {
        const { getByText } = render(<Badge size={size}>{size} badge</Badge>);
        expect(getByText(`${size} badge`)).toBeTruthy();
      });
    });

    it('applies small size padding', () => {
      const { getByText } = render(<Badge size="sm">Small</Badge>);
      const badge = getByText('Small').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingHorizontal: 8,
            paddingVertical: 2,
            minHeight: 20,
          }),
        ])
      );
    });

    it('applies medium size padding (default)', () => {
      const { getByText } = render(<Badge size="md">Medium</Badge>);
      const badge = getByText('Medium').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingHorizontal: 12,
            paddingVertical: 4,
            minHeight: 24,
          }),
        ])
      );
    });

    it('applies large size padding', () => {
      const { getByText } = render(<Badge size="lg">Large</Badge>);
      const badge = getByText('Large').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingHorizontal: 16,
            paddingVertical: 6,
            minHeight: 32,
          }),
        ])
      );
    });

    it('applies correct font size for sm', () => {
      const { getByText } = render(<Badge size="sm">Small</Badge>);
      const text = getByText('Small');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 12,
          }),
        ])
      );
    });

    it('applies correct font size for md', () => {
      const { getByText } = render(<Badge size="md">Medium</Badge>);
      const text = getByText('Medium');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 14,
          }),
        ])
      );
    });

    it('applies correct font size for lg', () => {
      const { getByText } = render(<Badge size="lg">Large</Badge>);
      const text = getByText('Large');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 16,
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Rounded Prop Tests
  // --------------------------------------------------------------------------

  describe('Rounded Prop', () => {
    it('applies default border radius when rounded is false', () => {
      const { getByText } = render(<Badge rounded={false}>Not Rounded</Badge>);
      const badge = getByText('Not Rounded').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: 12,
          }),
        ])
      );
    });

    it('applies full border radius when rounded is true', () => {
      const { getByText } = render(<Badge rounded={true}>Rounded</Badge>);
      const badge = getByText('Rounded').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: 100,
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Icon Tests
  // --------------------------------------------------------------------------

  describe('Icon', () => {
    it('renders without icon by default', () => {
      const { queryByTestId } = render(<Badge>No Icon</Badge>);
      expect(queryByTestId(/icon-/)).toBeNull();
    });

    it('renders with icon when provided', () => {
      const { getByTestId } = render(<Badge icon="star">With Icon</Badge>);
      expect(getByTestId('icon-star')).toBeTruthy();
    });

    it('applies correct icon size for sm badge', () => {
      const { getByTestId } = render(
        <Badge icon="star" size="sm">Small</Badge>
      );
      const icon = getByTestId('icon-star');
      expect(icon.props.accessibilityLabel).toContain('size: 12');
    });

    it('applies correct icon size for md badge', () => {
      const { getByTestId } = render(
        <Badge icon="star" size="md">Medium</Badge>
      );
      const icon = getByTestId('icon-star');
      expect(icon.props.accessibilityLabel).toContain('size: 14');
    });

    it('applies correct icon size for lg badge', () => {
      const { getByTestId } = render(
        <Badge icon="star" size="lg">Large</Badge>
      );
      const icon = getByTestId('icon-star');
      expect(icon.props.accessibilityLabel).toContain('size: 16');
    });

    it('applies correct icon color for colored variant', () => {
      const { getByTestId } = render(
        <Badge icon="star" variant="primary">Icon</Badge>
      );
      const icon = getByTestId('icon-star');
      expect(icon.props.accessibilityLabel).toContain('color: #FFFFFF');
    });

    it('applies correct icon color for neutral variant', () => {
      const { getByTestId } = render(
        <Badge icon="star" variant="neutral">Icon</Badge>
      );
      const icon = getByTestId('icon-star');
      expect(icon.props.accessibilityLabel).toContain('color: #171717');
    });

    it('positions icon before text', () => {
      const { getByText, getByTestId } = render(
        <Badge icon="star">Text</Badge>
      );
      const content = getByText('Text').parent;
      const icon = getByTestId('icon-star');

      expect(content?.props.children[0]).toBeTruthy(); // Icon should be first child
      expect(icon).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Press Handling Tests
  // --------------------------------------------------------------------------

  describe('Press Handling', () => {
    it('renders as View when onPress is not provided', () => {
      const { getByText } = render(<Badge>Static Badge</Badge>);
      const badge = getByText('Static Badge').parent;
      expect(badge?.type).toBe('View');
    });

    it('renders as TouchableOpacity when onPress is provided', () => {
      const { getByText } = render(
        <Badge onPress={() => {}}>Pressable Badge</Badge>
      );
      const badge = getByText('Pressable Badge').parent?.parent; // Due to Animated.View wrapper
      expect(badge?.type).toBe('TouchableOpacity');
    });

    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Badge onPress={onPress}>Press Me</Badge>
      );

      fireEvent.press(getByText('Press Me'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('wraps pressable badge in Animated.View', () => {
      const { getByText } = render(
        <Badge onPress={() => {}}>Animated</Badge>
      );
      const badge = getByText('Animated').parent?.parent;
      const animatedWrapper = badge?.parent;

      expect(animatedWrapper?.type.displayName).toBe('AnimatedComponent');
    });

    it('has activeOpacity of 1', () => {
      const { getByText } = render(
        <Badge onPress={() => {}}>Press</Badge>
      );
      const touchable = getByText('Press').parent?.parent;
      expect(touchable?.props.activeOpacity).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has button role when pressable', () => {
      const { getByRole } = render(
        <Badge onPress={() => {}}>Button Badge</Badge>
      );
      expect(getByRole('button')).toBeTruthy();
    });

    it('has text role when static', () => {
      const { getByRole } = render(<Badge>Text Badge</Badge>);
      expect(getByRole('text')).toBeTruthy();
    });

    it('sets accessibility label for string children', () => {
      const { getByLabelText } = render(<Badge>Test Label</Badge>);
      expect(getByLabelText('Test Label')).toBeTruthy();
    });

    it('does not set accessibility label for non-string children', () => {
      const { getByText } = render(
        <Badge>
          <React.Fragment>Complex</React.Fragment>
        </Badge>
      );
      const badge = getByText('Complex').parent;
      expect(badge?.props.accessibilityLabel).toBeUndefined();
    });

    it('updates accessibility state when pressed', () => {
      const { getByRole } = render(
        <Badge onPress={() => {}}>Pressable</Badge>
      );
      const badge = getByRole('button');

      fireEvent(badge, 'pressIn');
      expect(badge.props.accessibilityState.selected).toBe(true);

      fireEvent(badge, 'pressOut');
      expect(badge.props.accessibilityState.selected).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Custom Style Tests
  // --------------------------------------------------------------------------

  describe('Custom Styles', () => {
    it('applies custom style prop to badge', () => {
      const customStyle = { marginTop: 20, marginBottom: 10 };
      const { getByText } = render(
        <Badge style={customStyle}>Styled</Badge>
      );
      const badge = getByText('Styled').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([customStyle])
      );
    });

    it('applies custom textStyle prop to text', () => {
      const customTextStyle = { letterSpacing: 1 };
      const { getByText } = render(
        <Badge textStyle={customTextStyle}>Styled Text</Badge>
      );
      const text = getByText('Styled Text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([customTextStyle])
      );
    });

    it('merges custom styles with default styles', () => {
      const customStyle = { opacity: 0.8 };
      const { getByText } = render(
        <Badge variant="primary" style={customStyle}>Merged</Badge>
      );
      const badge = getByText('Merged').parent;
      const styles = badge?.props.style.flat();

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#0EA5E9' }),
          customStyle,
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Shadow Tests
  // --------------------------------------------------------------------------

  describe('Shadows', () => {
    it('applies shadow styles', () => {
      const { getByText } = render(<Badge>Shadow</Badge>);
      const badge = getByText('Shadow').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            shadowColor: '#171717',
            shadowOpacity: 0.05,
          }),
        ])
      );
    });
  });
});

// ============================================================================
// CHIP COMPONENT TESTS
// ============================================================================

describe('Chip Component', () => {
  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------

  describe('Rendering', () => {
    it('renders with default props', () => {
      const { getByText } = render(<Chip>Test Chip</Chip>);
      expect(getByText('Test Chip')).toBeTruthy();
    });

    it('renders with string children', () => {
      const { getByText } = render(<Chip>Chip Text</Chip>);
      expect(getByText('Chip Text')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const { getByTestId } = render(<Chip testID="custom-chip">Test</Chip>);
      expect(getByTestId('custom-chip')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Selection Tests
  // --------------------------------------------------------------------------

  describe('Selection', () => {
    it('renders unselected by default', () => {
      const { getByText } = render(<Chip>Unselected</Chip>);
      const chip = getByText('Unselected').parent;
      expect(chip?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderWidth: 1,
          }),
        ])
      );
    });

    it('applies border when not selected', () => {
      const { getByText } = render(<Chip selected={false}>Not Selected</Chip>);
      const chip = getByText('Not Selected').parent;
      expect(chip?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderWidth: 1,
            borderColor: '#E5E5E5',
          }),
        ])
      );
    });

    it('removes border when selected', () => {
      const { getByText } = render(<Chip selected={true}>Selected</Chip>);
      const chip = getByText('Selected').parent;
      expect(chip?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderWidth: 0,
            borderColor: 'transparent',
          }),
        ])
      );
    });

    it('uses neutral variant when not selected', () => {
      const { getByText } = render(<Chip selected={false}>Neutral</Chip>);
      const chip = getByText('Neutral').parent;
      expect(chip?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#F5F5F5',
          }),
        ])
      );
    });

    it('switches to primary variant when selected', () => {
      const { getByText } = render(<Chip selected={true}>Primary</Chip>);
      const chip = getByText('Primary').parent;
      expect(chip?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });

    it('exposes selected state in accessibility', () => {
      const { getByRole } = render(
        <Chip selected={true} onPress={() => {}}>Selected</Chip>
      );
      const chip = getByRole('button');
      expect(chip.props.accessibilityState.selected).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Delete Functionality Tests
  // --------------------------------------------------------------------------

  describe('Delete Functionality', () => {
    it('does not render delete button when onDelete is not provided', () => {
      const { queryByLabelText } = render(<Chip>No Delete</Chip>);
      expect(queryByLabelText('Remove')).toBeNull();
    });

    it('renders delete button when onDelete is provided', () => {
      const { getByLabelText } = render(
        <Chip onDelete={() => {}}>With Delete</Chip>
      );
      expect(getByLabelText('Remove')).toBeTruthy();
    });

    it('calls onDelete when delete button is pressed', () => {
      const onDelete = jest.fn();
      const { getByLabelText } = render(
        <Chip onDelete={onDelete}>Delete Me</Chip>
      );

      fireEvent.press(getByLabelText('Remove'));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('renders default close icon', () => {
      const { getByTestId } = render(
        <Chip onDelete={() => {}}>Default Icon</Chip>
      );
      expect(getByTestId('icon-close')).toBeTruthy();
    });

    it('renders custom delete icon', () => {
      const { getByTestId } = render(
        <Chip onDelete={() => {}} deleteIcon="checkmark">Custom Icon</Chip>
      );
      expect(getByTestId('icon-checkmark')).toBeTruthy();
    });

    it('applies hit slop to delete button', () => {
      const { getByLabelText } = render(
        <Chip onDelete={() => {}}>Hit Slop</Chip>
      );
      const deleteButton = getByLabelText('Remove');
      expect(deleteButton.props.hitSlop).toEqual({
        top: 8,
        bottom: 8,
        left: 8,
        right: 8,
      });
    });

    it('positions delete button after text', () => {
      const { getByText, getByLabelText } = render(
        <Chip onDelete={() => {}}>Text</Chip>
      );
      const content = getByText('Text').parent;
      const deleteButton = getByLabelText('Remove');

      // Delete button should be last child
      expect(content?.props.children[2]).toBeTruthy();
      expect(deleteButton).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Press Handling Tests
  // --------------------------------------------------------------------------

  describe('Press Handling', () => {
    it('renders as View when onPress is not provided', () => {
      const { getByText } = render(<Chip>Static Chip</Chip>);
      const chip = getByText('Static Chip').parent;
      expect(chip?.type).toBe('View');
    });

    it('renders as TouchableOpacity when onPress is provided', () => {
      const { getByText } = render(
        <Chip onPress={() => {}}>Pressable Chip</Chip>
      );
      const chip = getByText('Pressable Chip').parent;
      expect(chip?.type).toBe('TouchableOpacity');
    });

    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Chip onPress={onPress}>Press Me</Chip>
      );

      fireEvent.press(getByText('Press Me'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress independently from onDelete', () => {
      const onPress = jest.fn();
      const onDelete = jest.fn();
      const { getByText, getByLabelText } = render(
        <Chip onPress={onPress} onDelete={onDelete}>Chip</Chip>
      );

      fireEvent.press(getByText('Chip'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onDelete).not.toHaveBeenCalled();

      fireEvent.press(getByLabelText('Remove'));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledTimes(1); // Should not increment
    });
  });

  // --------------------------------------------------------------------------
  // Icon Tests
  // --------------------------------------------------------------------------

  describe('Icon', () => {
    it('renders with icon', () => {
      const { getByTestId } = render(<Chip icon="star">With Icon</Chip>);
      expect(getByTestId('icon-star')).toBeTruthy();
    });

    it('renders both icon and delete button', () => {
      const { getByTestId } = render(
        <Chip icon="heart" onDelete={() => {}}>Both Icons</Chip>
      );
      expect(getByTestId('icon-heart')).toBeTruthy();
      expect(getByTestId('icon-close')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has button role when pressable', () => {
      const { getByRole } = render(
        <Chip onPress={() => {}}>Button Chip</Chip>
      );
      expect(getByRole('button')).toBeTruthy();
    });

    it('has text role when static', () => {
      const { getByRole } = render(<Chip>Text Chip</Chip>);
      expect(getByRole('text')).toBeTruthy();
    });

    it('delete button has button role', () => {
      const { getAllByRole } = render(
        <Chip onDelete={() => {}}>Chip</Chip>
      );
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('delete button has Remove label', () => {
      const { getByLabelText } = render(
        <Chip onDelete={() => {}}>Chip</Chip>
      );
      expect(getByLabelText('Remove')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Custom Style Tests
  // --------------------------------------------------------------------------

  describe('Custom Styles', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 20 };
      const { getByText } = render(
        <Chip style={customStyle}>Styled</Chip>
      );
      const chip = getByText('Styled').parent;
      expect(chip?.props.style).toEqual(
        expect.arrayContaining([customStyle])
      );
    });

    it('applies custom textStyle prop', () => {
      const customTextStyle = { letterSpacing: 2 };
      const { getByText } = render(
        <Chip textStyle={customTextStyle}>Styled Text</Chip>
      );
      const text = getByText('Styled Text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([customTextStyle])
      );
    });
  });
});

// ============================================================================
// NOTIFICATION BADGE COMPONENT TESTS
// ============================================================================

describe('NotificationBadge Component', () => {
  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------

  describe('Rendering', () => {
    it('renders with count', () => {
      const { getByText } = render(<NotificationBadge count={5} />);
      expect(getByText('5')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const { getByTestId } = render(
        <NotificationBadge count={5} testID="custom-notification" />
      );
      expect(getByTestId('custom-notification')).toBeTruthy();
    });

    it('has text role', () => {
      const { getByRole } = render(<NotificationBadge count={5} />);
      expect(getByRole('text')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Count Display Tests
  // --------------------------------------------------------------------------

  describe('Count Display', () => {
    it('displays count correctly', () => {
      const { getByText } = render(<NotificationBadge count={7} />);
      expect(getByText('7')).toBeTruthy();
    });

    it('displays single digit count', () => {
      const { getByText } = render(<NotificationBadge count={1} />);
      expect(getByText('1')).toBeTruthy();
    });

    it('displays double digit count', () => {
      const { getByText } = render(<NotificationBadge count={42} />);
      expect(getByText('42')).toBeTruthy();
    });

    it('displays count up to maxCount', () => {
      const { getByText } = render(<NotificationBadge count={99} />);
      expect(getByText('99')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Max Count Tests
  // --------------------------------------------------------------------------

  describe('Max Count', () => {
    it('uses default maxCount of 99', () => {
      const { getByText } = render(<NotificationBadge count={150} />);
      expect(getByText('99+')).toBeTruthy();
    });

    it('displays "99+" when count exceeds default maxCount', () => {
      const { getByText } = render(<NotificationBadge count={100} />);
      expect(getByText('99+')).toBeTruthy();
    });

    it('displays "99+" when count is 200', () => {
      const { getByText } = render(<NotificationBadge count={200} />);
      expect(getByText('99+')).toBeTruthy();
    });

    it('uses custom maxCount', () => {
      const { getByText } = render(
        <NotificationBadge count={150} maxCount={200} />
      );
      expect(getByText('150')).toBeTruthy();
    });

    it('displays custom maxCount+ when exceeded', () => {
      const { getByText } = render(
        <NotificationBadge count={50} maxCount={25} />
      );
      expect(getByText('25+')).toBeTruthy();
    });

    it('displays exact maxCount when count equals maxCount', () => {
      const { getByText } = render(
        <NotificationBadge count={99} maxCount={99} />
      );
      expect(getByText('99')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Zero Handling Tests
  // --------------------------------------------------------------------------

  describe('Zero Handling', () => {
    it('returns null when count is 0 by default', () => {
      const { container } = render(<NotificationBadge count={0} />);
      expect(container.children.length).toBe(0);
    });

    it('returns null when count is 0 and showZero is false', () => {
      const { container } = render(
        <NotificationBadge count={0} showZero={false} />
      );
      expect(container.children.length).toBe(0);
    });

    it('displays "0" when count is 0 and showZero is true', () => {
      const { getByText } = render(
        <NotificationBadge count={0} showZero={true} />
      );
      expect(getByText('0')).toBeTruthy();
    });

    it('renders component when count is greater than 0', () => {
      const { getByText } = render(<NotificationBadge count={1} />);
      expect(getByText('1')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('sets singular notification label for count 1', () => {
      const { getByLabelText } = render(<NotificationBadge count={1} />);
      expect(getByLabelText('1 notification')).toBeTruthy();
    });

    it('sets plural notification label for count > 1', () => {
      const { getByLabelText } = render(<NotificationBadge count={5} />);
      expect(getByLabelText('5 notifications')).toBeTruthy();
    });

    it('sets plural notification label for count 0 with showZero', () => {
      const { getByLabelText } = render(
        <NotificationBadge count={0} showZero={true} />
      );
      expect(getByLabelText('0 notifications')).toBeTruthy();
    });

    it('sets plural notification label for count > maxCount', () => {
      const { getByLabelText } = render(<NotificationBadge count={150} />);
      expect(getByLabelText('150 notifications')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Positioning Tests
  // --------------------------------------------------------------------------

  describe('Positioning', () => {
    it('applies absolute positioning', () => {
      const { getByText } = render(<NotificationBadge count={5} />);
      const badge = getByText('5').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            position: 'absolute',
            top: -8,
            right: -8,
          }),
        ])
      );
    });

    it('applies correct positioning for all sizes', () => {
      const sizes: BadgeSize[] = ['sm', 'md', 'lg'];

      sizes.forEach((size) => {
        const { getByText } = render(
          <NotificationBadge count={5} size={size} />
        );
        const badge = getByText('5').parent;
        expect(badge?.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              top: -8,
              right: -8,
            }),
          ])
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // Size Tests
  // --------------------------------------------------------------------------

  describe('Sizes', () => {
    it('uses sm size by default', () => {
      const { getByText } = render(<NotificationBadge count={5} />);
      const text = getByText('5');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 12,
          }),
        ])
      );
    });

    it('applies sm size dimensions', () => {
      const { getByText } = render(<NotificationBadge count={5} size="sm" />);
      const badge = getByText('5').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            minWidth: 18,
            height: 18,
          }),
        ])
      );
    });

    it('applies md size dimensions', () => {
      const { getByText } = render(<NotificationBadge count={5} size="md" />);
      const badge = getByText('5').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            minWidth: 20,
            height: 20,
          }),
        ])
      );
    });

    it('applies lg size dimensions', () => {
      const { getByText } = render(<NotificationBadge count={5} size="lg" />);
      const badge = getByText('5').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            minWidth: 24,
            height: 24,
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Variant Tests
  // --------------------------------------------------------------------------

  describe('Variants', () => {
    it('uses error variant by default', () => {
      const { getByText } = render(<NotificationBadge count={5} />);
      const badge = getByText('5').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#EF4444',
          }),
        ])
      );
    });

    it('applies custom variant', () => {
      const { getByText } = render(
        <NotificationBadge count={5} variant="success" />
      );
      const badge = getByText('5').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#22C55E',
          }),
        ])
      );
    });

    it('is always rounded', () => {
      const { getByText } = render(<NotificationBadge count={5} />);
      const badge = getByText('5').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: 100,
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Custom Style Tests
  // --------------------------------------------------------------------------

  describe('Custom Styles', () => {
    it('applies custom style prop', () => {
      const customStyle = { opacity: 0.9 };
      const { getByText } = render(
        <NotificationBadge count={5} style={customStyle} />
      );
      const badge = getByText('5').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([customStyle])
      );
    });

    it('merges custom styles with default positioning', () => {
      const customStyle = { top: -12, backgroundColor: 'purple' };
      const { getByText } = render(
        <NotificationBadge count={5} style={customStyle} />
      );
      const badge = getByText('5').parent;
      const styles = badge?.props.style.flat();

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ position: 'absolute' }),
          customStyle,
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Layout Tests
  // --------------------------------------------------------------------------

  describe('Layout', () => {
    it('centers content', () => {
      const { getByText } = render(<NotificationBadge count={5} />);
      const badge = getByText('5').parent;
      expect(badge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            justifyContent: 'center',
            alignItems: 'center',
          }),
        ])
      );
    });

    it('truncates text to single line', () => {
      const { getByText } = render(<NotificationBadge count={999} />);
      const text = getByText('99+');
      expect(text.props.numberOfLines).toBe(1);
    });
  });
});

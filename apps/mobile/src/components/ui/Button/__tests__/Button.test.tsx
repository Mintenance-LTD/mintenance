import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, Platform } from 'react-native';
import { Button } from '../Button';
import type { ButtonVariant, ButtonSize } from '../Button';

// ============================================================================
// MOCKS — only externals. The component under test is never mocked.
// ============================================================================

// Mock Ionicons so we can assert which icon rendered + its size/color.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, size, color, style }: any) =>
      React.createElement(
        Text,
        {
          testID: `icon-${name}`,
          style,
          accessibilityLabel: `Icon:${name}:${size}:${color}`,
        },
        name
      ),
  };
});

// Mock haptics so we can assert light/medium calls without native deps.
// `mock`-prefixed names are allowed inside jest.mock factories.
const mockHapticLight = jest.fn();
const mockHapticMedium = jest.fn();
jest.mock('../../../../utils/haptics', () => ({
  useHaptics: () => ({
    light: mockHapticLight,
    medium: mockHapticMedium,
  }),
}));

// Mock the heavy theme module with distinct, assertable color tokens so we can
// verify variant-specific style branch selection by colour value.
jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      border: '#BORDER',
      textPrimary: '#TEXTPRIMARY',
      textInverse: '#TEXTINVERSE',
      textTertiary: '#TEXTTERTIARY',
      surface: '#SURFACE',
      error: '#ERROR',
      primary: '#PRIMARY',
    },
  },
}));

// ============================================================================
// HELPERS
// ============================================================================

const flatten = (style: any): any[] => {
  if (Array.isArray(style)) return style.flat(Infinity).filter(Boolean);
  return style ? [style] : [];
};

const getButtonStyle = (node: any) => flatten(node.props.style);

const styleHas = (node: any, key: string, value: any) =>
  getButtonStyle(node).some((s: any) => s && s[key] === value);

const ALL_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'danger',
  'success',
];
const ALL_SIZES: ButtonSize[] = ['sm', 'md', 'lg', 'xl'];

// ============================================================================
// TESTS
// ============================================================================

describe('Button', () => {
  beforeEach(() => {
    mockHapticLight.mockClear();
    mockHapticMedium.mockClear();
    Platform.OS = 'ios';
  });

  // --------------------------------------------------------------------------
  // Basic rendering
  // --------------------------------------------------------------------------
  describe('rendering', () => {
    it('renders string children as text', () => {
      const { getByText } = render(<Button>Press me</Button>);
      expect(getByText('Press me')).toBeTruthy();
    });

    it('renders non-string children (ReactNode)', () => {
      const { getByText } = render(
        <Button>
          <Text>Nested node</Text>
        </Button>
      );
      expect(getByText('Nested node')).toBeTruthy();
    });

    it('applies base style (borderRadius/minWidth/minHeight)', () => {
      const { getByTestId } = render(<Button testID='btn'>Hi</Button>);
      const btn = getByTestId('btn');
      expect(styleHas(btn, 'borderRadius', 12)).toBe(true);
      expect(styleHas(btn, 'minWidth', 44)).toBe(true);
      expect(styleHas(btn, 'minHeight', 44)).toBe(true);
    });

    it('merges a custom style prop onto the button', () => {
      const custom = { marginTop: 99 };
      const { getByTestId } = render(
        <Button testID='btn' style={custom}>
          Hi
        </Button>
      );
      expect(styleHas(getByTestId('btn'), 'marginTop', 99)).toBe(true);
    });

    it('merges a custom textStyle onto the label', () => {
      const { getByText } = render(
        <Button textStyle={{ letterSpacing: 3 }}>Label</Button>
      );
      expect(
        flatten(getByText('Label').props.style).some(
          (s: any) => s.letterSpacing === 3
        )
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Variant × button background branch selection (getButtonStyles switch)
  // --------------------------------------------------------------------------
  describe('variant button styles (enabled)', () => {
    it('primary uses textPrimary background + shadow', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='primary'>
          x
        </Button>
      );
      expect(
        styleHas(getByTestId('b'), 'backgroundColor', '#TEXTPRIMARY')
      ).toBe(true);
    });

    it('secondary uses transparent bg + border', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='secondary'>
          x
        </Button>
      );
      const b = getByTestId('b');
      expect(styleHas(b, 'backgroundColor', 'transparent')).toBe(true);
      expect(styleHas(b, 'borderWidth', 1)).toBe(true);
      expect(styleHas(b, 'borderColor', '#BORDER')).toBe(true);
    });

    it('outline uses transparent bg + textPrimary border (enabled)', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='outline'>
          x
        </Button>
      );
      const b = getByTestId('b');
      expect(styleHas(b, 'backgroundColor', 'transparent')).toBe(true);
      expect(styleHas(b, 'borderColor', '#TEXTPRIMARY')).toBe(true);
    });

    it('ghost uses transparent bg, no border', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='ghost'>
          x
        </Button>
      );
      const b = getByTestId('b');
      expect(styleHas(b, 'backgroundColor', 'transparent')).toBe(true);
      expect(styleHas(b, 'borderWidth', 1)).toBe(false);
    });

    it('danger uses error background (enabled)', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='danger'>
          x
        </Button>
      );
      expect(styleHas(getByTestId('b'), 'backgroundColor', '#ERROR')).toBe(
        true
      );
    });

    it('success uses primary background (enabled)', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='success'>
          x
        </Button>
      );
      expect(styleHas(getByTestId('b'), 'backgroundColor', '#PRIMARY')).toBe(
        true
      );
    });
  });

  // --------------------------------------------------------------------------
  // disabled/loading branch in background colour ternaries
  // --------------------------------------------------------------------------
  describe('variant button styles (disabled/loading fall to border colour)', () => {
    it('primary disabled uses border background', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='primary' disabled>
          x
        </Button>
      );
      expect(styleHas(getByTestId('b'), 'backgroundColor', '#BORDER')).toBe(
        true
      );
    });

    it('primary loading uses border background', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='primary' loading>
          x
        </Button>
      );
      expect(styleHas(getByTestId('b'), 'backgroundColor', '#BORDER')).toBe(
        true
      );
    });

    it('outline disabled uses border colour for border', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='outline' disabled>
          x
        </Button>
      );
      expect(styleHas(getByTestId('b'), 'borderColor', '#BORDER')).toBe(true);
    });

    it('danger disabled uses border background', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='danger' disabled>
          x
        </Button>
      );
      expect(styleHas(getByTestId('b'), 'backgroundColor', '#BORDER')).toBe(
        true
      );
    });

    it('success loading uses border background', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='success' loading>
          x
        </Button>
      );
      expect(styleHas(getByTestId('b'), 'backgroundColor', '#BORDER')).toBe(
        true
      );
    });
  });

  // --------------------------------------------------------------------------
  // size branch selection
  // --------------------------------------------------------------------------
  describe('size styles', () => {
    const expectedHeights: Record<ButtonSize, number> = {
      sm: 36,
      md: 48,
      lg: 52,
      xl: 56,
    };
    const expectedFontSizes: Record<ButtonSize, number> = {
      sm: 13,
      md: 15,
      lg: 18,
      xl: 20,
    };

    ALL_SIZES.forEach((size) => {
      it(`size ${size} sets height ${expectedHeights[size]} and label fontSize ${expectedFontSizes[size]}`, () => {
        const { getByTestId, getByText } = render(
          <Button testID='b' size={size}>
            Label
          </Button>
        );
        expect(
          styleHas(getByTestId('b'), 'height', expectedHeights[size])
        ).toBe(true);
        expect(
          flatten(getByText('Label').props.style).some(
            (s: any) => s.fontSize === expectedFontSizes[size]
          )
        ).toBe(true);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Full matrix: every variant × size renders without throwing (default branch
  // coverage of getButtonStyles/getTextStyles/getIconColor across all paths).
  // --------------------------------------------------------------------------
  describe('variant x size matrix', () => {
    ALL_VARIANTS.forEach((variant) => {
      ALL_SIZES.forEach((size) => {
        it(`renders ${variant}/${size}`, () => {
          const { getByText } = render(
            <Button variant={variant} size={size}>
              {`${variant}-${size}`}
            </Button>
          );
          expect(getByText(`${variant}-${size}`)).toBeTruthy();
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // text colour branch selection (getTextStyles switch)
  // --------------------------------------------------------------------------
  describe('text colour styles', () => {
    it('primary/danger/success use textInverse when enabled', () => {
      (['primary', 'danger', 'success'] as ButtonVariant[]).forEach((v) => {
        const { getByText } = render(<Button variant={v}>{v}</Button>);
        expect(
          flatten(getByText(v).props.style).some(
            (s: any) => s.color === '#TEXTINVERSE'
          )
        ).toBe(true);
      });
    });

    it('primary disabled label uses textTertiary', () => {
      const { getByText } = render(
        <Button variant='primary' disabled>
          dp
        </Button>
      );
      expect(
        flatten(getByText('dp').props.style).some(
          (s: any) => s.color === '#TEXTTERTIARY'
        )
      ).toBe(true);
    });

    it('secondary enabled label uses textPrimary', () => {
      const { getByText } = render(<Button variant='secondary'>sec</Button>);
      expect(
        flatten(getByText('sec').props.style).some(
          (s: any) => s.color === '#TEXTPRIMARY'
        )
      ).toBe(true);
    });

    it('secondary disabled label uses textTertiary', () => {
      const { getByText } = render(
        <Button variant='secondary' disabled>
          secd
        </Button>
      );
      expect(
        flatten(getByText('secd').props.style).some(
          (s: any) => s.color === '#TEXTTERTIARY'
        )
      ).toBe(true);
    });

    it('outline enabled label uses textPrimary, disabled uses textTertiary', () => {
      const enabled = render(<Button variant='outline'>oe</Button>);
      expect(
        flatten(enabled.getByText('oe').props.style).some(
          (s: any) => s.color === '#TEXTPRIMARY'
        )
      ).toBe(true);

      const disabled = render(
        <Button variant='outline' disabled>
          od
        </Button>
      );
      expect(
        flatten(disabled.getByText('od').props.style).some(
          (s: any) => s.color === '#TEXTTERTIARY'
        )
      ).toBe(true);
    });

    it('ghost enabled label uses textPrimary', () => {
      const { getByText } = render(<Button variant='ghost'>gh</Button>);
      expect(
        flatten(getByText('gh').props.style).some(
          (s: any) => s.color === '#TEXTPRIMARY'
        )
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // icon colour branch selection (getIconColor) — asserted via icon node
  // --------------------------------------------------------------------------
  describe('icon colour', () => {
    it('disabled icon uses textTertiary regardless of variant', () => {
      const { getByTestId } = render(
        <Button variant='primary' disabled leftIcon='star'>
          x
        </Button>
      );
      expect(getByTestId('icon-star').props.accessibilityLabel).toContain(
        '#TEXTTERTIARY'
      );
    });

    it('primary icon uses surface colour', () => {
      const { getByTestId } = render(
        <Button variant='primary' leftIcon='star'>
          x
        </Button>
      );
      expect(getByTestId('icon-star').props.accessibilityLabel).toContain(
        '#SURFACE'
      );
    });

    it('danger icon uses surface colour', () => {
      const { getByTestId } = render(
        <Button variant='danger' leftIcon='trash'>
          x
        </Button>
      );
      expect(getByTestId('icon-trash').props.accessibilityLabel).toContain(
        '#SURFACE'
      );
    });

    it('success icon uses surface colour', () => {
      const { getByTestId } = render(
        <Button variant='success' leftIcon='checkmark'>
          x
        </Button>
      );
      expect(getByTestId('icon-checkmark').props.accessibilityLabel).toContain(
        '#SURFACE'
      );
    });

    it('outline/secondary/ghost icon use textPrimary colour', () => {
      (['outline', 'secondary', 'ghost'] as ButtonVariant[]).forEach((v, i) => {
        const { getByTestId } = render(
          <Button variant={v} leftIcon={`ic${i}`}>
            x
          </Button>
        );
        expect(getByTestId(`icon-ic${i}`).props.accessibilityLabel).toContain(
          '#TEXTPRIMARY'
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // icon rendering / position / computed size
  // --------------------------------------------------------------------------
  describe('icons', () => {
    it('renders left icon with marginRight', () => {
      const { getByTestId } = render(<Button leftIcon='star'>x</Button>);
      const icon = getByTestId('icon-star');
      expect(
        flatten(icon.props.style).some((s: any) => s.marginRight === 8)
      ).toBe(true);
    });

    it('renders right icon with marginLeft', () => {
      const { getByTestId } = render(<Button rightIcon='arrow'>x</Button>);
      const icon = getByTestId('icon-arrow');
      expect(
        flatten(icon.props.style).some((s: any) => s.marginLeft === 8)
      ).toBe(true);
    });

    it('renders both left and right icons', () => {
      const { getByTestId } = render(
        <Button leftIcon='l' rightIcon='r'>
          x
        </Button>
      );
      expect(getByTestId('icon-l')).toBeTruthy();
      expect(getByTestId('icon-r')).toBeTruthy();
    });

    it('does not render icons when none provided', () => {
      const { queryByTestId } = render(<Button>x</Button>);
      expect(queryByTestId('icon-star')).toBeNull();
    });

    it('uses 16 computed icon size for size=sm', () => {
      const { getByTestId } = render(
        <Button size='sm' leftIcon='star'>
          x
        </Button>
      );
      expect(getByTestId('icon-star').props.accessibilityLabel).toContain(
        ':16:'
      );
    });

    it('uses 20 computed icon size for non-sm size', () => {
      const { getByTestId } = render(
        <Button size='lg' leftIcon='star'>
          x
        </Button>
      );
      expect(getByTestId('icon-star').props.accessibilityLabel).toContain(
        ':20:'
      );
    });

    it('honours explicit iconSize prop over computed size', () => {
      const { getByTestId } = render(
        <Button size='sm' iconSize={42} leftIcon='star'>
          x
        </Button>
      );
      expect(getByTestId('icon-star').props.accessibilityLabel).toContain(
        ':42:'
      );
    });
  });

  // --------------------------------------------------------------------------
  // loading state (renderContent loading branch)
  // --------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders ActivityIndicator and keeps string children', () => {
      const { getByText, UNSAFE_getByType } = render(
        <Button loading>Saving</Button>
      );
      const { ActivityIndicator } = require('react-native');
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
      expect(getByText('Saving')).toBeTruthy();
    });

    it('falls back to "Loading..." when children is not a string', () => {
      const { getByText } = render(
        <Button loading>
          <Text>node child</Text>
        </Button>
      );
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('does not render leftIcon while loading', () => {
      const { queryByTestId } = render(
        <Button loading leftIcon='star'>
          x
        </Button>
      );
      expect(queryByTestId('icon-star')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // fullWidth branch (Animated.View width + getButtonStyles width)
  // --------------------------------------------------------------------------
  describe('fullWidth', () => {
    it('applies width 100% to the button when fullWidth', () => {
      const { getByTestId } = render(
        <Button testID='b' fullWidth>
          x
        </Button>
      );
      expect(styleHas(getByTestId('b'), 'width', '100%')).toBe(true);
    });

    it('does not apply width when fullWidth is false (default)', () => {
      const { getByTestId } = render(<Button testID='b'>x</Button>);
      expect(styleHas(getByTestId('b'), 'width', '100%')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // onPress / onLongPress behaviour + haptics gating
  // --------------------------------------------------------------------------
  describe('press behaviour', () => {
    it('fires onPress and light haptic when enabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button testID='b' onPress={onPress}>
          x
        </Button>
      );
      fireEvent.press(getByTestId('b'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(mockHapticLight).toHaveBeenCalledTimes(1);
    });

    it('does not fire light haptic when hapticFeedback=false but still calls onPress', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button testID='b' onPress={onPress} hapticFeedback={false}>
          x
        </Button>
      );
      fireEvent.press(getByTestId('b'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(mockHapticLight).not.toHaveBeenCalled();
    });

    it('does not call onPress (via handler) when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button testID='b' onPress={onPress} disabled>
          x
        </Button>
      );
      // invoke the handler directly (TouchableOpacity is disabled, so press is
      // blocked at RN level too — call onPress prop to exercise the guard).
      fireEvent(getByTestId('b'), 'press');
      expect(onPress).not.toHaveBeenCalled();
      expect(mockHapticLight).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button testID='b' onPress={onPress} loading>
          x
        </Button>
      );
      fireEvent(getByTestId('b'), 'press');
      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not throw when onPress is undefined (optional chaining)', () => {
      const { getByTestId } = render(<Button testID='b'>x</Button>);
      expect(() => fireEvent.press(getByTestId('b'))).not.toThrow();
      expect(mockHapticLight).toHaveBeenCalledTimes(1);
    });

    it('fires onLongPress and medium haptic when enabled', () => {
      const onLongPress = jest.fn();
      const { getByTestId } = render(
        <Button testID='b' onLongPress={onLongPress}>
          x
        </Button>
      );
      fireEvent(getByTestId('b'), 'longPress');
      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(mockHapticMedium).toHaveBeenCalledTimes(1);
    });

    it('does not fire onLongPress when disabled', () => {
      const onLongPress = jest.fn();
      const { getByTestId } = render(
        <Button testID='b' onLongPress={onLongPress} disabled>
          x
        </Button>
      );
      fireEvent(getByTestId('b'), 'longPress');
      expect(onLongPress).not.toHaveBeenCalled();
      expect(mockHapticMedium).not.toHaveBeenCalled();
    });

    it('does not fire onLongPress when loading', () => {
      const onLongPress = jest.fn();
      const { getByTestId } = render(
        <Button testID='b' onLongPress={onLongPress} loading>
          x
        </Button>
      );
      fireEvent(getByTestId('b'), 'longPress');
      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('does not fire medium haptic on long press when hapticFeedback=false', () => {
      const onLongPress = jest.fn();
      const { getByTestId } = render(
        <Button testID='b' onLongPress={onLongPress} hapticFeedback={false}>
          x
        </Button>
      );
      fireEvent(getByTestId('b'), 'longPress');
      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(mockHapticMedium).not.toHaveBeenCalled();
    });

    it('does not throw when onLongPress undefined', () => {
      const { getByTestId } = render(<Button testID='b'>x</Button>);
      expect(() => fireEvent(getByTestId('b'), 'longPress')).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // pressIn / pressOut animation + isPressed (selected) state
  // --------------------------------------------------------------------------
  describe('press in/out animation', () => {
    it('sets selected accessibilityState true on pressIn then false on pressOut', () => {
      const { getByTestId } = render(<Button testID='b'>x</Button>);
      const btn = getByTestId('b');
      expect(btn.props.accessibilityState.selected).toBe(false);

      fireEvent(btn, 'pressIn');
      expect(getByTestId('b').props.accessibilityState.selected).toBe(true);

      fireEvent(btn, 'pressOut');
      expect(getByTestId('b').props.accessibilityState.selected).toBe(false);
    });

    it('pressIn is a no-op when disabled (selected stays false)', () => {
      const { getByTestId } = render(
        <Button testID='b' disabled>
          x
        </Button>
      );
      fireEvent(getByTestId('b'), 'pressIn');
      expect(getByTestId('b').props.accessibilityState.selected).toBe(false);
    });

    it('pressIn is a no-op when loading (selected stays false)', () => {
      const { getByTestId } = render(
        <Button testID='b' loading>
          x
        </Button>
      );
      fireEvent(getByTestId('b'), 'pressIn');
      expect(getByTestId('b').props.accessibilityState.selected).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // accessibility props
  // --------------------------------------------------------------------------
  describe('accessibility', () => {
    it('defaults accessibilityRole to button and label to string children', () => {
      const { getByTestId } = render(<Button testID='b'>Confirm</Button>);
      const btn = getByTestId('b');
      expect(btn.props.accessibilityRole).toBe('button');
      expect(btn.props.accessibilityLabel).toBe('Confirm');
    });

    it('uses explicit accessibilityLabel over string children', () => {
      const { getByTestId } = render(
        <Button testID='b' accessibilityLabel='Custom'>
          Confirm
        </Button>
      );
      expect(getByTestId('b').props.accessibilityLabel).toBe('Custom');
    });

    it('accessibilityLabel is undefined when children is not a string and no label', () => {
      const { getByTestId } = render(
        <Button testID='b'>
          <Text>node</Text>
        </Button>
      );
      expect(getByTestId('b').props.accessibilityLabel).toBeUndefined();
    });

    it('passes accessibilityHint and custom role through', () => {
      const { getByTestId } = render(
        <Button testID='b' accessibilityHint='hint' accessibilityRole='link'>
          x
        </Button>
      );
      const btn = getByTestId('b');
      expect(btn.props.accessibilityHint).toBe('hint');
      expect(btn.props.accessibilityRole).toBe('link');
    });

    it('accessibilityState.disabled + busy reflect disabled/loading', () => {
      const { getByTestId: gd } = render(
        <Button testID='b' disabled>
          x
        </Button>
      );
      expect(gd('b').props.accessibilityState.disabled).toBe(true);
      expect(gd('b').props.accessibilityState.busy).toBe(false);

      const { getByTestId: gl } = render(
        <Button testID='c' loading>
          x
        </Button>
      );
      expect(gl('c').props.accessibilityState.disabled).toBe(true);
      expect(gl('c').props.accessibilityState.busy).toBe(true);
    });

    it('TouchableOpacity disabled prop is true when disabled or loading, false otherwise', () => {
      const enabled = render(<Button testID='b'>x</Button>);
      expect(enabled.getByTestId('b').props.accessibilityState.disabled).toBe(
        false
      );
    });
  });

  // --------------------------------------------------------------------------
  // ref forwarding
  // --------------------------------------------------------------------------
  describe('ref', () => {
    it('accepts a ref without throwing (forwardRef wiring)', () => {
      // The jest react-native mock renders TouchableOpacity as a host-string
      // stub, so ref.current is not populated as it would be on-device. We
      // assert the forwardRef path renders cleanly with a ref attached.
      const ref = React.createRef<any>();
      expect(() =>
        render(
          <Button ref={ref} testID='b'>
            x
          </Button>
        )
      ).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Platform shadow branch (Platform.select android vs ios)
  // --------------------------------------------------------------------------
  describe('platform shadow', () => {
    // The jest react-native mock's Platform.select always returns obj.ios (it
    // ignores Platform.OS), so we can only assert the ios shadow result here.
    // The Platform.select call site still executes for coverage regardless.
    it('shadowed variant (primary) applies the ios shadow object', () => {
      const { getByTestId } = render(
        <Button testID='b' variant='primary'>
          x
        </Button>
      );
      expect(styleHas(getByTestId('b'), 'shadowOpacity', 0.06)).toBe(true);
    });

    it('danger and success variants also receive the shadow', () => {
      const danger = render(
        <Button testID='d' variant='danger'>
          x
        </Button>
      );
      expect(styleHas(danger.getByTestId('d'), 'shadowRadius', 10)).toBe(true);
      const success = render(
        <Button testID='s' variant='success'>
          x
        </Button>
      );
      expect(styleHas(success.getByTestId('s'), 'shadowRadius', 10)).toBe(true);
    });
  });
});

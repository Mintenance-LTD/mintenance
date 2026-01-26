import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ButtonGroup } from '../ButtonGroup';
import { Button } from '../Button';
import type { ButtonGroupButton, ButtonGroupProps } from '../ButtonGroup';

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
  },
}));

jest.mock('../../../../design-system/tokens', () => ({
  designTokens: {
    colors: {
      primary: { 500: '#0EA5E9', 600: '#0284C7', 700: '#0369A1' },
      secondary: { 50: '#F0FDF9', 500: '#10B981', 600: '#059669', 700: '#047857' },
      success: { 500: '#22C55E', 600: '#16A34A' },
      error: { 500: '#EF4444', 600: '#DC2626' },
      warning: { 500: '#F59E0B', 600: '#D97706' },
      info: { 500: '#3B82F6', 600: '#2563EB' },
      neutral: {
        0: '#FFFFFF',
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#E5E5E5',
        300: '#D4D4D4',
        400: '#A3A3A3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
      },
      surface: '#FFFFFF',
      border: '#E5E5E5',
      text: '#171717',
      textSecondary: '#737373',
      white: '#FFFFFF',
    },
    spacing: {
      0: 0,
      0.5: 2,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      none: 0,
      sm: 4,
      base: 6,
      md: 8,
      lg: 12,
      xl: 16,
      full: 9999,
    },
    typography: {
      body: {
        fontSize: 16,
        fontWeight: '400',
      },
      fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
    semanticColors: {
      text: {
        primary: '#171717',
        secondary: '#737373',
        tertiary: '#A3A3A3',
        inverse: '#FFFFFF',
        disabled: '#D4D4D4',
      },
      interactive: {
        primary: '#0EA5E9',
        primaryHover: '#0284C7',
        primaryPressed: '#0369A1',
        primaryDisabled: '#E5E5E5',
        secondary: '#10B981',
        secondaryHover: '#059669',
        secondaryPressed: '#047857',
        secondaryDisabled: '#E5E5E5',
      },
      border: {
        primary: '#E5E5E5',
      },
      background: {
        primary: '#FFFFFF',
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
      md: {
        shadowColor: '#171717',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
      },
    },
    componentSizes: {
      button: {
        sm: {
          height: 32,
          paddingHorizontal: 12,
          fontSize: 14,
        },
        md: {
          height: 40,
          paddingHorizontal: 16,
          fontSize: 16,
        },
        lg: {
          height: 48,
          paddingHorizontal: 24,
          fontSize: 18,
        },
        xl: {
          height: 56,
          paddingHorizontal: 32,
          fontSize: 20,
        },
      },
      icon: {
        sm: 16,
        md: 20,
      },
    },
    accessibility: {
      minTouchTarget: {
        width: 44,
        height: 44,
      },
    },
  },
}));

jest.mock('../../../../utils/haptics', () => ({
  useHaptics: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
  }),
}));

// ============================================================================
// TEST DATA
// ============================================================================

const createButtonArray = (count: number): ButtonGroupButton[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `btn-${i}`,
    title: `Button ${i}`,
    value: `value-${i}`,
  }));
};

const defaultButtons: ButtonGroupButton[] = [
  { id: '1', title: 'Option 1', value: 'opt1' },
  { id: '2', title: 'Option 2', value: 'opt2' },
  { id: '3', title: 'Option 3', value: 'opt3' },
];

// ============================================================================
// BUTTONGROUP COMPONENT TESTS
// ============================================================================

describe('ButtonGroup Component', () => {
  // --------------------------------------------------------------------------
  // Rendering Tests - Button Array Mode
  // --------------------------------------------------------------------------

  describe('Rendering - Button Array Mode', () => {
    it('renders with button array', () => {
      const { getByText } = render(<ButtonGroup buttons={defaultButtons} />);
      expect(getByText('Option 1')).toBeTruthy();
      expect(getByText('Option 2')).toBeTruthy();
      expect(getByText('Option 3')).toBeTruthy();
    });

    it('renders with single button', () => {
      const buttons = [{ id: '1', title: 'Single', value: 'single' }];
      const { getByText } = render(<ButtonGroup buttons={buttons} />);
      expect(getByText('Single')).toBeTruthy();
    });

    it('renders with many buttons', () => {
      const buttons = createButtonArray(10);
      const { getByText } = render(<ButtonGroup buttons={buttons} />);
      expect(getByText('Button 0')).toBeTruthy();
      expect(getByText('Button 9')).toBeTruthy();
    });

    it('renders empty array gracefully', () => {
      const { getByTestId } = render(<ButtonGroup buttons={[]} />);
      const container = getByTestId('button-group');
      expect(container.props.children.length).toBe(0);
    });

    it('renders container with testID', () => {
      const { getByTestId } = render(<ButtonGroup buttons={defaultButtons} />);
      expect(getByTestId('button-group')).toBeTruthy();
    });

    it('renders each button with correct testID', () => {
      const { getByTestId } = render(<ButtonGroup buttons={defaultButtons} />);
      expect(getByTestId('button-1')).toBeTruthy();
      expect(getByTestId('button-2')).toBeTruthy();
      expect(getByTestId('button-3')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Rendering Tests - Legacy Children Mode
  // --------------------------------------------------------------------------

  describe('Rendering - Legacy Children Mode', () => {
    it('renders with Button children', () => {
      const { getByText } = render(
        <ButtonGroup>
          <Button>Child 1</Button>
          <Button>Child 2</Button>
        </ButtonGroup>
      );
      expect(getByText('Child 1')).toBeTruthy();
      expect(getByText('Child 2')).toBeTruthy();
    });

    it('renders single child Button', () => {
      const { getByText } = render(
        <ButtonGroup>
          <Button>Single Child</Button>
        </ButtonGroup>
      );
      expect(getByText('Single Child')).toBeTruthy();
    });

    it('renders multiple Button children', () => {
      const { getByText } = render(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
          <Button>Fourth</Button>
        </ButtonGroup>
      );
      expect(getByText('First')).toBeTruthy();
      expect(getByText('Fourth')).toBeTruthy();
    });

    it('prefers buttons prop over children', () => {
      const { getByText, queryByText } = render(
        <ButtonGroup buttons={defaultButtons}>
          <Button>Should Not Render</Button>
        </ButtonGroup>
      );
      expect(getByText('Option 1')).toBeTruthy();
      expect(queryByText('Should Not Render')).toBeNull();
    });

    it('renders fallback View when no buttons or children', () => {
      const { container } = render(<ButtonGroup />);
      expect(container).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Orientation Tests
  // --------------------------------------------------------------------------

  describe('Orientation', () => {
    it('uses horizontal orientation by default', () => {
      const { getByTestId } = render(<ButtonGroup buttons={defaultButtons} />);
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
          }),
        ])
      );
    });

    it('applies horizontal flexDirection', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} orientation="horizontal" />
      );
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
          }),
        ])
      );
    });

    it('applies vertical flexDirection', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} orientation="vertical" />
      );
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'column',
          }),
        ])
      );
    });

    it('applies flexWrap for horizontal orientation', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} orientation="horizontal" />
      );
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexWrap: 'wrap',
          }),
        ])
      );
    });

    it('does not apply flexWrap for vertical orientation', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} orientation="vertical" />
      );
      const container = getByTestId('button-group');
      const styles = container.props.style.flat();
      const hasFlexWrap = styles.some((style: any) => style?.flexWrap === 'wrap');
      expect(hasFlexWrap).toBe(false);
    });

    it('applies horizontal orientation in legacy mode', () => {
      const { getByText } = render(
        <ButtonGroup orientation="horizontal">
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );
      const container = getByText('Button 1').parent?.parent?.parent;
      expect(container?.props.style).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
        })
      );
    });

    it('applies vertical orientation in legacy mode', () => {
      const { getByText } = render(
        <ButtonGroup orientation="vertical">
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );
      const container = getByText('Button 1').parent?.parent?.parent;
      expect(container?.props.style).toEqual(
        expect.objectContaining({
          flexDirection: 'column',
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Spacing Tests
  // --------------------------------------------------------------------------

  describe('Spacing', () => {
    it('uses sm spacing by default', () => {
      const { getByTestId } = render(<ButtonGroup buttons={defaultButtons} />);
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            gap: 8,
          }),
        ])
      );
    });

    it('applies sm spacing (8px)', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} spacing="sm" />
      );
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            gap: 8,
          }),
        ])
      );
    });

    it('applies md spacing (16px)', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} spacing="md" />
      );
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            gap: 16,
          }),
        ])
      );
    });

    it('applies lg spacing (24px)', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} spacing="lg" />
      );
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            gap: 24,
          }),
        ])
      );
    });

    it('applies xl spacing (32px)', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} spacing="xl" />
      );
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            gap: 32,
          }),
        ])
      );
    });

    it('applies marginRight in legacy horizontal mode', () => {
      const { getByText } = render(
        <ButtonGroup spacing="md" orientation="horizontal">
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );
      const firstButton = getByText('Button 1').parent?.parent;
      expect(firstButton?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginRight: 16,
          }),
        ])
      );
    });

    it('applies marginBottom in legacy vertical mode', () => {
      const { getByText } = render(
        <ButtonGroup spacing="md" orientation="vertical">
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );
      const firstButton = getByText('Button 1').parent?.parent;
      expect(firstButton?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginBottom: 16,
          }),
        ])
      );
    });

    it('does not apply margin to last child in legacy mode', () => {
      const { getByText } = render(
        <ButtonGroup spacing="md">
          <Button>First</Button>
          <Button>Last</Button>
        </ButtonGroup>
      );
      const lastButton = getByText('Last').parent?.parent;
      const styles = Array.isArray(lastButton?.props.style)
        ? lastButton.props.style.flat()
        : [lastButton?.props.style];
      const hasMarginRight = styles.some((s: any) => s?.marginRight);
      expect(hasMarginRight).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Selection Mode Tests - Single
  // --------------------------------------------------------------------------

  describe('Selection Mode - Single', () => {
    it('uses single selection mode by default', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup buttons={defaultButtons} onSelectionChange={onSelectionChange} />
      );

      fireEvent.press(getByText('Option 1'));
      expect(onSelectionChange).toHaveBeenCalledWith(['opt1']);

      fireEvent.press(getByText('Option 2'));
      expect(onSelectionChange).toHaveBeenCalledWith(['opt2']);
    });

    it('selects button in single mode', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="single"
        />
      );

      fireEvent.press(getByText('Option 1'));
      expect(onSelectionChange).toHaveBeenCalledWith(['opt1']);
    });

    it('replaces selection in single mode', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="single"
        />
      );

      fireEvent.press(getByText('Option 1'));
      fireEvent.press(getByText('Option 2'));

      expect(onSelectionChange).toHaveBeenNthCalledWith(1, ['opt1']);
      expect(onSelectionChange).toHaveBeenNthCalledWith(2, ['opt2']);
    });

    it('allows selecting same button multiple times', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="single"
        />
      );

      fireEvent.press(getByText('Option 1'));
      fireEvent.press(getByText('Option 1'));

      expect(onSelectionChange).toHaveBeenCalledTimes(2);
      expect(onSelectionChange).toHaveBeenLastCalledWith(['opt1']);
    });

    it('displays selected state visually', () => {
      const { getByText, getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          selectedValues={['opt2']}
        />
      );

      const selectedButton = getByTestId('button-2');
      expect(selectedButton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });

    it('displays unselected state visually', () => {
      const { getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          selectedValues={['opt2']}
        />
      );

      const unselectedButton = getByTestId('button-1');
      expect(unselectedButton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#FFFFFF',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Selection Mode Tests - Multiple
  // --------------------------------------------------------------------------

  describe('Selection Mode - Multiple', () => {
    it('allows multiple selections', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="multiple"
        />
      );

      fireEvent.press(getByText('Option 1'));
      fireEvent.press(getByText('Option 2'));

      expect(onSelectionChange).toHaveBeenNthCalledWith(1, ['opt1']);
      expect(onSelectionChange).toHaveBeenNthCalledWith(2, ['opt1', 'opt2']);
    });

    it('adds to selection in multiple mode', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="multiple"
        />
      );

      fireEvent.press(getByText('Option 1'));
      fireEvent.press(getByText('Option 3'));

      expect(onSelectionChange).toHaveBeenLastCalledWith(['opt1', 'opt3']);
    });

    it('deselects button when pressed again', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="multiple"
          selectedValues={['opt1', 'opt2']}
        />
      );

      fireEvent.press(getByText('Option 1'));
      expect(onSelectionChange).toHaveBeenCalledWith(['opt2']);
    });

    it('toggles button selection', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="multiple"
        />
      );

      fireEvent.press(getByText('Option 1'));
      fireEvent.press(getByText('Option 1'));

      expect(onSelectionChange).toHaveBeenNthCalledWith(1, ['opt1']);
      expect(onSelectionChange).toHaveBeenNthCalledWith(2, []);
    });

    it('displays multiple selected states', () => {
      const { getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          selectedValues={['opt1', 'opt3']}
          selectionMode="multiple"
        />
      );

      const button1 = getByTestId('button-1');
      const button3 = getByTestId('button-3');

      expect(button1.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );

      expect(button3.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });

    it('allows selecting all buttons', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="multiple"
        />
      );

      fireEvent.press(getByText('Option 1'));
      fireEvent.press(getByText('Option 2'));
      fireEvent.press(getByText('Option 3'));

      expect(onSelectionChange).toHaveBeenLastCalledWith(['opt1', 'opt2', 'opt3']);
    });

    it('allows deselecting all buttons', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="multiple"
          selectedValues={['opt1', 'opt2', 'opt3']}
        />
      );

      fireEvent.press(getByText('Option 1'));
      fireEvent.press(getByText('Option 2'));
      fireEvent.press(getByText('Option 3'));

      expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    });
  });

  // --------------------------------------------------------------------------
  // Selected Values Tests
  // --------------------------------------------------------------------------

  describe('Selected Values', () => {
    it('accepts empty selectedValues array', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} selectedValues={[]} />
      );
      const container = getByTestId('button-group');
      expect(container).toBeTruthy();
    });

    it('accepts selectedValues prop', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} selectedValues={['opt1']} />
      );
      const button = getByTestId('button-1');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });

    it('updates displayed selection when selectedValues changes', () => {
      const { getByTestId, rerender } = render(
        <ButtonGroup buttons={defaultButtons} selectedValues={['opt1']} />
      );

      let button1 = getByTestId('button-1');
      expect(button1.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );

      rerender(
        <ButtonGroup buttons={defaultButtons} selectedValues={['opt2']} />
      );

      const button2 = getByTestId('button-2');
      expect(button2.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });

    it('uses internal state when selectedValues is empty', () => {
      const onSelectionChange = jest.fn();
      const { getByText, getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
        />
      );

      fireEvent.press(getByText('Option 1'));

      const button = getByTestId('button-1');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });

    it('prefers selectedValues prop over internal state', () => {
      const { getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          selectedValues={['opt2']}
        />
      );

      const button2 = getByTestId('button-2');
      expect(button2.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Disabled Button Tests
  // --------------------------------------------------------------------------

  describe('Disabled Buttons', () => {
    it('renders disabled button', () => {
      const buttons = [
        { id: '1', title: 'Enabled', value: 'val1' },
        { id: '2', title: 'Disabled', value: 'val2', disabled: true },
      ];
      const { getByTestId } = render(<ButtonGroup buttons={buttons} />);

      const disabledButton = getByTestId('button-2');
      expect(disabledButton.props.disabled).toBe(true);
    });

    it('applies disabled styles', () => {
      const buttons = [
        { id: '1', title: 'Disabled', value: 'val1', disabled: true },
      ];
      const { getByTestId } = render(<ButtonGroup buttons={buttons} />);

      const button = getByTestId('button-1');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            opacity: 0.5,
          }),
        ])
      );
    });

    it('does not trigger onSelectionChange when disabled button pressed', () => {
      const onSelectionChange = jest.fn();
      const buttons = [
        { id: '1', title: 'Disabled', value: 'val1', disabled: true },
      ];
      const { getByText } = render(
        <ButtonGroup buttons={buttons} onSelectionChange={onSelectionChange} />
      );

      fireEvent.press(getByText('Disabled'));
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('allows selecting enabled buttons when some are disabled', () => {
      const onSelectionChange = jest.fn();
      const buttons = [
        { id: '1', title: 'Enabled', value: 'val1' },
        { id: '2', title: 'Disabled', value: 'val2', disabled: true },
      ];
      const { getByText } = render(
        <ButtonGroup buttons={buttons} onSelectionChange={onSelectionChange} />
      );

      fireEvent.press(getByText('Enabled'));
      expect(onSelectionChange).toHaveBeenCalledWith(['val1']);
    });

    it('displays disabled text color', () => {
      const buttons = [
        { id: '1', title: 'Disabled', value: 'val1', disabled: true },
      ];
      const { getByText } = render(<ButtonGroup buttons={buttons} />);

      const text = getByText('Disabled');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#737373',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Button Text Style Tests
  // --------------------------------------------------------------------------

  describe('Button Text Styles', () => {
    it('applies default text color to unselected button', () => {
      const { getByText } = render(<ButtonGroup buttons={defaultButtons} />);
      const text = getByText('Option 1');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#171717',
          }),
        ])
      );
    });

    it('applies white text color to selected button', () => {
      const { getByText } = render(
        <ButtonGroup buttons={defaultButtons} selectedValues={['opt1']} />
      );
      const text = getByText('Option 1');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#FFFFFF',
          }),
        ])
      );
    });

    it('applies correct font size', () => {
      const { getByText } = render(<ButtonGroup buttons={defaultButtons} />);
      const text = getByText('Option 1');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 16,
          }),
        ])
      );
    });

    it('applies correct font weight', () => {
      const { getByText } = render(<ButtonGroup buttons={defaultButtons} />);
      const text = getByText('Option 1');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: '400',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Button Container Style Tests
  // --------------------------------------------------------------------------

  describe('Button Container Styles', () => {
    it('applies default button styles', () => {
      const { getByTestId } = render(<ButtonGroup buttons={defaultButtons} />);
      const button = getByTestId('button-1');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#E5E5E5',
            minHeight: 44,
          }),
        ])
      );
    });

    it('applies selected button background', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} selectedValues={['opt1']} />
      );
      const button = getByTestId('button-1');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
            borderColor: '#0EA5E9',
          }),
        ])
      );
    });

    it('applies center alignment', () => {
      const { getByTestId } = render(<ButtonGroup buttons={defaultButtons} />);
      const button = getByTestId('button-1');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignItems: 'center',
            justifyContent: 'center',
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
      const customStyle = { marginTop: 20, paddingVertical: 10 };
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} style={customStyle} />
      );
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([customStyle])
      );
    });

    it('merges custom styles with default styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} style={customStyle} />
      );
      const container = getByTestId('button-group');
      const styles = container.props.style.flat();

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ flexDirection: 'row' }),
          customStyle,
        ])
      );
    });

    it('applies custom style in legacy mode', () => {
      const customStyle = { padding: 20 };
      const { getByText } = render(
        <ButtonGroup style={customStyle}>
          <Button>Button 1</Button>
        </ButtonGroup>
      );
      const container = getByText('Button 1').parent?.parent?.parent;
      expect(container?.props.style).toEqual(
        expect.objectContaining(customStyle)
      );
    });
  });

  // --------------------------------------------------------------------------
  // OnSelectionChange Callback Tests
  // --------------------------------------------------------------------------

  describe('OnSelectionChange Callback', () => {
    it('does not call onSelectionChange when undefined', () => {
      const { getByText } = render(<ButtonGroup buttons={defaultButtons} />);
      expect(() => fireEvent.press(getByText('Option 1'))).not.toThrow();
    });

    it('calls onSelectionChange with correct values', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup buttons={defaultButtons} onSelectionChange={onSelectionChange} />
      );

      fireEvent.press(getByText('Option 1'));
      expect(onSelectionChange).toHaveBeenCalledWith(['opt1']);
    });

    it('calls onSelectionChange exactly once per press', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup buttons={defaultButtons} onSelectionChange={onSelectionChange} />
      );

      fireEvent.press(getByText('Option 1'));
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
    });

    it('passes array of values to callback', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="multiple"
        />
      );

      fireEvent.press(getByText('Option 1'));
      fireEvent.press(getByText('Option 2'));

      expect(onSelectionChange).toHaveBeenLastCalledWith(['opt1', 'opt2']);
      expect(Array.isArray(onSelectionChange.mock.calls[0][0])).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Legacy Layout Prop Tests
  // --------------------------------------------------------------------------

  describe('Legacy Layout Prop', () => {
    it('uses layout prop when provided', () => {
      const { getByTestId } = render(
        <ButtonGroup buttons={defaultButtons} layout="vertical" />
      );
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
          }),
        ])
      );
    });

    it('orientation takes precedence over layout', () => {
      const { getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          layout="horizontal"
          orientation="vertical"
        />
      );
      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'column',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Edge Case Tests
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles button with empty title', () => {
      const buttons = [{ id: '1', title: '', value: 'val1' }];
      const { getByTestId } = render(<ButtonGroup buttons={buttons} />);
      expect(getByTestId('button-1')).toBeTruthy();
    });

    it('handles button with long title', () => {
      const buttons = [
        {
          id: '1',
          title: 'This is a very long button title that should still render correctly',
          value: 'val1',
        },
      ];
      const { getByText } = render(<ButtonGroup buttons={buttons} />);
      expect(
        getByText('This is a very long button title that should still render correctly')
      ).toBeTruthy();
    });

    it('handles rapid button presses', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup buttons={defaultButtons} onSelectionChange={onSelectionChange} />
      );

      const button = getByText('Option 1');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(onSelectionChange).toHaveBeenCalledTimes(3);
    });

    it('handles selection with duplicate values in selectedValues', () => {
      const { getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          selectedValues={['opt1', 'opt1', 'opt1']}
        />
      );
      const button = getByTestId('button-1');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });

    it('handles selectedValues with non-existent values', () => {
      const { getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          selectedValues={['non-existent']}
        />
      );
      const container = getByTestId('button-group');
      expect(container).toBeTruthy();
    });

    it('handles mixed valid and invalid selectedValues', () => {
      const { getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          selectedValues={['opt1', 'invalid', 'opt2']}
        />
      );
      const button1 = getByTestId('button-1');
      const button2 = getByTestId('button-2');

      expect(button1.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );

      expect(button2.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Legacy Mode Spacing Tests
  // --------------------------------------------------------------------------

  describe('Legacy Mode Spacing', () => {
    it('applies spacing to all but last child horizontally', () => {
      const { getByText } = render(
        <ButtonGroup spacing="lg" orientation="horizontal">
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </ButtonGroup>
      );

      const firstButton = getByText('First').parent?.parent;
      const secondButton = getByText('Second').parent?.parent;
      const thirdButton = getByText('Third').parent?.parent;

      expect(firstButton?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginRight: 24,
          }),
        ])
      );

      expect(secondButton?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginRight: 24,
          }),
        ])
      );

      const thirdStyles = Array.isArray(thirdButton?.props.style)
        ? thirdButton.props.style.flat()
        : [thirdButton?.props.style];
      const hasMarginRight = thirdStyles.some((s: any) => s?.marginRight);
      expect(hasMarginRight).toBe(false);
    });

    it('applies spacing to all but last child vertically', () => {
      const { getByText } = render(
        <ButtonGroup spacing="xl" orientation="vertical">
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </ButtonGroup>
      );

      const firstButton = getByText('First').parent?.parent;
      const secondButton = getByText('Second').parent?.parent;
      const thirdButton = getByText('Third').parent?.parent;

      expect(firstButton?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginBottom: 32,
          }),
        ])
      );

      expect(secondButton?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginBottom: 32,
          }),
        ])
      );

      const thirdStyles = Array.isArray(thirdButton?.props.style)
        ? thirdButton.props.style.flat()
        : [thirdButton?.props.style];
      const hasMarginBottom = thirdStyles.some((s: any) => s?.marginBottom);
      expect(hasMarginBottom).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('handles complete single selection workflow', () => {
      const onSelectionChange = jest.fn();
      const { getByText, getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="single"
        />
      );

      // Select first button
      fireEvent.press(getByText('Option 1'));
      expect(onSelectionChange).toHaveBeenLastCalledWith(['opt1']);

      // Select second button (should replace)
      fireEvent.press(getByText('Option 2'));
      expect(onSelectionChange).toHaveBeenLastCalledWith(['opt2']);

      // Select third button
      fireEvent.press(getByText('Option 3'));
      expect(onSelectionChange).toHaveBeenLastCalledWith(['opt3']);

      expect(onSelectionChange).toHaveBeenCalledTimes(3);
    });

    it('handles complete multiple selection workflow', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={onSelectionChange}
          selectionMode="multiple"
        />
      );

      // Add selections
      fireEvent.press(getByText('Option 1'));
      fireEvent.press(getByText('Option 2'));
      fireEvent.press(getByText('Option 3'));

      // Remove one
      fireEvent.press(getByText('Option 2'));

      // Add it back
      fireEvent.press(getByText('Option 2'));

      expect(onSelectionChange).toHaveBeenNthCalledWith(1, ['opt1']);
      expect(onSelectionChange).toHaveBeenNthCalledWith(2, ['opt1', 'opt2']);
      expect(onSelectionChange).toHaveBeenNthCalledWith(3, ['opt1', 'opt2', 'opt3']);
      expect(onSelectionChange).toHaveBeenNthCalledWith(4, ['opt1', 'opt3']);
      expect(onSelectionChange).toHaveBeenNthCalledWith(5, ['opt1', 'opt3', 'opt2']);
    });

    it('handles controlled component pattern', () => {
      const onSelectionChange = jest.fn();
      const { getByText, getByTestId, rerender } = render(
        <ButtonGroup
          buttons={defaultButtons}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
        />
      );

      // Press button but don't change selectedValues
      fireEvent.press(getByText('Option 1'));
      expect(onSelectionChange).toHaveBeenCalledWith(['opt1']);

      // Parent updates selectedValues
      rerender(
        <ButtonGroup
          buttons={defaultButtons}
          selectedValues={['opt1']}
          onSelectionChange={onSelectionChange}
        />
      );

      const button = getByTestId('button-1');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#0EA5E9',
          }),
        ])
      );
    });

    it('handles vertical orientation with multiple selection', () => {
      const onSelectionChange = jest.fn();
      const { getByText, getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          orientation="vertical"
          selectionMode="multiple"
          spacing="lg"
          onSelectionChange={onSelectionChange}
        />
      );

      const container = getByTestId('button-group');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'column',
            gap: 24,
          }),
        ])
      );

      fireEvent.press(getByText('Option 1'));
      fireEvent.press(getByText('Option 2'));

      expect(onSelectionChange).toHaveBeenLastCalledWith(['opt1', 'opt2']);
    });
  });
});

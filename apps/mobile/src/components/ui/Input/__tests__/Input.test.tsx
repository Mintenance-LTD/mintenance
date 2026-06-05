import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '../../../../__tests__/test-utils';
import { Input } from '../Input';

// Mock the Ionicons heavy native icon lib with a lightweight stub that
// surfaces its name + color as testID/props so assertions can read them.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({
      name,
      size,
      color,
    }: {
      name: string;
      size: number;
      color: string;
    }) =>
      React.createElement(
        Text,
        { testID: `icon-${name}`, accessibilityLabel: `${color}:${size}` },
        name
      ),
  };
});

describe('Input', () => {
  it('renders with default props (md / outline / default state)', () => {
    const { getByTestId } = render(
      <Input testID='inp' value='' onChangeText={jest.fn()} />
    );
    expect(getByTestId('inp')).toBeTruthy();
  });

  // --- label branches ----------------------------------------------------
  it('renders no label when label prop omitted', () => {
    const { queryByText } = render(<Input testID='inp' />);
    expect(queryByText('My Label')).toBeNull();
  });

  it('renders animated outline label (variant=outline + label)', () => {
    const { toJSON } = render(
      <Input testID='inp' variant='outline' label='My Label' />
    );
    expect(JSON.stringify(toJSON())).toContain('My Label');
  });

  it('renders static label for non-outline variant', () => {
    const { getByText } = render(
      <Input testID='inp' variant='filled' label='Filled Label' />
    );
    expect(getByText('Filled Label')).toBeTruthy();
  });

  it('renders required asterisk on outline label when required', () => {
    const { getByText } = render(
      <Input testID='inp' variant='outline' label='Email' required />
    );
    expect(getByText('*')).toBeTruthy();
  });

  it('renders required asterisk on static label when required', () => {
    const { getByText } = render(
      <Input testID='inp' variant='underline' label='Email' required />
    );
    expect(getByText('*')).toBeTruthy();
  });

  it('omits required asterisk when not required', () => {
    const { queryByText } = render(
      <Input testID='inp' variant='outline' label='Email' required={false} />
    );
    expect(queryByText('*')).toBeNull();
  });

  // --- variants ----------------------------------------------------------
  it.each(['outline', 'filled', 'underline'] as const)(
    'renders variant=%s',
    (variant) => {
      const { getByTestId } = render(<Input testID='inp' variant={variant} />);
      expect(getByTestId('inp')).toBeTruthy();
    }
  );

  // --- sizes (drives INPUT_SIZES + icon size branch) ---------------------
  it('renders size=sm with small (16px) icon', () => {
    const { getByTestId } = render(
      <Input testID='inp' size='sm' leftIcon='search' />
    );
    // sm -> iSize 16
    expect(getByTestId('icon-search').props.accessibilityLabel).toContain(
      ':16'
    );
  });

  it('renders size=md with large (20px) icon', () => {
    const { getByTestId } = render(
      <Input testID='inp' size='md' leftIcon='search' />
    );
    expect(getByTestId('icon-search').props.accessibilityLabel).toContain(
      ':20'
    );
  });

  it('renders size=lg', () => {
    const { getByTestId } = render(<Input testID='inp' size='lg' />);
    expect(getByTestId('inp')).toBeTruthy();
  });

  // --- variant x disabled (drives disabled bg ternary in each case) ------
  it.each(['outline', 'filled', 'underline'] as const)(
    'renders variant=%s with state=disabled (disabled bg branch)',
    (variant) => {
      const { getByPlaceholderText } = render(
        <Input
          testID='inp'
          variant={variant}
          state='disabled'
          placeholder='ph'
        />
      );
      expect(getByPlaceholderText('ph').props.editable).toBe(false);
    }
  );

  it.each(['filled', 'underline'] as const)(
    'focuses variant=%s to hit focused border-width branch',
    (variant) => {
      const { getByPlaceholderText } = render(
        <Input testID='inp' variant={variant} placeholder='ph' />
      );
      fireEvent(getByPlaceholderText('ph'), 'focus', { nativeEvent: {} });
      expect(getByPlaceholderText('ph')).toBeTruthy();
    }
  );

  // --- fullWidth ---------------------------------------------------------
  it('renders fullWidth=true', () => {
    const { getByTestId } = render(<Input testID='inp' fullWidth />);
    expect(getByTestId('inp')).toBeTruthy();
  });

  // --- states ------------------------------------------------------------
  it.each(['default', 'error', 'success', 'disabled'] as const)(
    'renders state=%s',
    (state) => {
      const { getByTestId } = render(
        <Input testID='inp' state={state} leftIcon='alert' placeholder='ph' />
      );
      expect(getByTestId('inp')).toBeTruthy();
    }
  );

  it('disables TextInput editing when state=disabled', () => {
    const { getByPlaceholderText } = render(
      <Input testID='inp' state='disabled' placeholder='ph' />
    );
    expect(getByPlaceholderText('ph').props.editable).toBe(false);
  });

  it('keeps TextInput editable when state!=disabled', () => {
    const { getByPlaceholderText } = render(
      <Input testID='inp' state='default' placeholder='ph' />
    );
    expect(getByPlaceholderText('ph').props.editable).toBe(true);
  });

  // --- icons -------------------------------------------------------------
  it('renders left icon only', () => {
    const { getByTestId, queryByTestId } = render(
      <Input testID='inp' leftIcon='search' />
    );
    expect(getByTestId('icon-search')).toBeTruthy();
    expect(queryByTestId('icon-close')).toBeNull();
  });

  it('renders right icon only', () => {
    const { getByTestId } = render(<Input testID='inp' rightIcon='close' />);
    expect(getByTestId('icon-close')).toBeTruthy();
  });

  it('renders both icons', () => {
    const { getByTestId } = render(
      <Input testID='inp' leftIcon='search' rightIcon='close' />
    );
    expect(getByTestId('icon-search')).toBeTruthy();
    expect(getByTestId('icon-close')).toBeTruthy();
  });

  it('right icon is pressable (TouchableOpacity) when onRightIconPress provided', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <Input testID='inp' rightIcon='eye' onRightIconPress={onPress} />
    );
    fireEvent.press(getByLabelText('eye button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('right icon is non-pressable (View) without onRightIconPress', () => {
    const { queryByLabelText } = render(<Input testID='inp' rightIcon='eye' />);
    // No accessibilityLabel `${icon} button` => not a button wrapper
    expect(queryByLabelText('eye button')).toBeNull();
  });

  // --- focus / blur ------------------------------------------------------
  it('calls onFocus and onBlur callbacks and toggles focus state', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByPlaceholderText } = render(
      <Input testID='inp' placeholder='ph' onFocus={onFocus} onBlur={onBlur} />
    );
    const ti = getByPlaceholderText('ph');
    fireEvent(ti, 'focus', { nativeEvent: {} });
    expect(onFocus).toHaveBeenCalledTimes(1);
    fireEvent(ti, 'blur', { nativeEvent: {} });
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('focus/blur work when no onFocus/onBlur callbacks given (optional-chaining branch)', () => {
    const { getByPlaceholderText } = render(
      <Input testID='inp' placeholder='ph' />
    );
    const ti = getByPlaceholderText('ph');
    expect(() => {
      fireEvent(ti, 'focus', { nativeEvent: {} });
      fireEvent(ti, 'blur', { nativeEvent: {} });
    }).not.toThrow();
  });

  it('blur with no value keeps label collapse branch (hasValue=false)', () => {
    const { getByPlaceholderText } = render(
      <Input testID='inp' placeholder='ph' />
    );
    const ti = getByPlaceholderText('ph');
    fireEvent(ti, 'focus', { nativeEvent: {} });
    fireEvent(ti, 'blur', { nativeEvent: {} });
    expect(ti).toBeTruthy();
  });

  it('blur after typing keeps label up (hasValue=true skips collapse branch)', () => {
    const { getByPlaceholderText } = render(
      <Input testID='inp' placeholder='ph' />
    );
    const ti = getByPlaceholderText('ph');
    fireEvent.changeText(ti, 'hello');
    fireEvent(ti, 'focus', { nativeEvent: {} });
    fireEvent(ti, 'blur', { nativeEvent: {} });
    expect(ti).toBeTruthy();
  });

  // --- change text -------------------------------------------------------
  it('forwards onChangeText with typed value (length > 0 branch)', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input testID='inp' placeholder='ph' onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText('ph'), 'abc');
    expect(onChangeText).toHaveBeenCalledWith('abc');
  });

  it('handles clearing text (length === 0 branch)', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input testID='inp' placeholder='ph' onChangeText={onChangeText} />
    );
    const ti = getByPlaceholderText('ph');
    fireEvent.changeText(ti, 'abc');
    fireEvent.changeText(ti, '');
    expect(onChangeText).toHaveBeenLastCalledWith('');
  });

  it('changeText works without onChangeText callback (optional-chaining branch)', () => {
    const { getByPlaceholderText } = render(
      <Input testID='inp' placeholder='ph' />
    );
    expect(() =>
      fireEvent.changeText(getByPlaceholderText('ph'), 'x')
    ).not.toThrow();
  });

  // --- helper / error text ----------------------------------------------
  it('renders helperText when provided and no error', () => {
    const { getByText } = render(
      <Input testID='inp' helperText='Helpful hint' />
    );
    expect(getByText('Helpful hint')).toBeTruthy();
  });

  it('renders errorText (overrides helperText) with error styling', () => {
    const { getByText, queryByText } = render(
      <Input testID='inp' helperText='Helpful hint' errorText='Bad input' />
    );
    expect(getByText('Bad input')).toBeTruthy();
    expect(queryByText('Helpful hint')).toBeNull();
  });

  it('renders no helper row when neither helperText nor errorText', () => {
    const { queryByText } = render(<Input testID='inp' />);
    expect(queryByText('Helpful hint')).toBeNull();
  });

  // --- initial value / defaultValue (hasValue + labelAnimation init) ----
  it('initializes hasValue=true from value prop', () => {
    const { getByDisplayValue } = render(
      <Input testID='inp' value='preset' onChangeText={jest.fn()} />
    );
    expect(getByDisplayValue('preset')).toBeTruthy();
  });

  it('initializes hasValue=true from defaultValue prop', () => {
    const { getByDisplayValue } = render(
      <Input testID='inp' defaultValue='dflt' />
    );
    expect(getByDisplayValue('dflt')).toBeTruthy();
  });

  // --- placeholderTextColor branch (outline + label => transparent) -----
  it('uses transparent placeholder color for outline + label', () => {
    const { getByPlaceholderText } = render(
      <Input testID='inp' variant='outline' label='L' placeholder='ph' />
    );
    expect(getByPlaceholderText('ph').props.placeholderTextColor).toBe(
      'transparent'
    );
  });

  it('uses tertiary placeholder color for outline without label', () => {
    const { getByPlaceholderText } = render(
      <Input testID='inp' variant='outline' placeholder='ph' />
    );
    expect(getByPlaceholderText('ph').props.placeholderTextColor).not.toBe(
      'transparent'
    );
  });

  it('uses tertiary placeholder color for non-outline variant with label', () => {
    const { getByPlaceholderText } = render(
      <Input testID='inp' variant='filled' label='L' placeholder='ph' />
    );
    expect(getByPlaceholderText('ph').props.placeholderTextColor).not.toBe(
      'transparent'
    );
  });

  // --- focus drives label/border color branches (isFocused=true paths) --
  it('applies focused border/label color branches after focus', () => {
    const { getByPlaceholderText, toJSON } = render(
      <Input
        testID='inp'
        variant='outline'
        label='Focusable'
        placeholder='ph'
      />
    );
    fireEvent(getByPlaceholderText('ph'), 'focus', { nativeEvent: {} });
    expect(JSON.stringify(toJSON())).toContain('Focusable');
  });

  it('focused icon color branch (state default + focused)', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <Input testID='inp' leftIcon='search' placeholder='ph' />
    );
    fireEvent(getByPlaceholderText('ph'), 'focus', { nativeEvent: {} });
    expect(getByTestId('icon-search')).toBeTruthy();
  });

  // --- unknown variant hits switch default branch (line 284) -------------
  it('falls back to base container styles for an unknown variant', () => {
    const { getByTestId } = render(
      <Input testID='inp' variant={'ghost' as never} placeholder='ph' />
    );
    expect(getByTestId('inp')).toBeTruthy();
  });

  // --- container / input style passthrough -------------------------------
  it('applies containerStyle and inputStyle overrides', () => {
    const { getByTestId, getByPlaceholderText } = render(
      <Input
        testID='inp'
        placeholder='ph'
        containerStyle={{ marginTop: 99 }}
        inputStyle={{ fontWeight: 'bold' } as never}
      />
    );
    expect(getByTestId('inp')).toBeTruthy();
    expect(getByPlaceholderText('ph')).toBeTruthy();
  });
});

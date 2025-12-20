import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ButtonGroup } from '../../../components/ui/Button/ButtonGroup';

// Mock haptics
jest.mock('../../../utils/haptics', () => ({
  useHaptics: () => ({
    buttonPress: jest.fn(),
    selection: jest.fn(),
  }),
}));

// Mock theme
jest.mock('../../../theme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      secondary: '#34C759',
      background: '#FFFFFF',
      surface: '#F2F2F7',
      text: '#000000',
      textSecondary: '#8E8E93',
      border: '#C6C6C8',
      error: '#FF3B30',
      warning: '#FF9500',
      success: '#34C759',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 6,
      md: 8,
      lg: 12,
    },
  }),
}));

describe('ButtonGroup', () => {
  const defaultButtons = [
    {
      id: 'option1',
      title: 'Option 1',
      value: 'value1',
    },
    {
      id: 'option2',
      title: 'Option 2',
      value: 'value2',
    },
    {
      id: 'option3',
      title: 'Option 3',
      value: 'value3',
    },
  ];

  it('renders all buttons correctly', () => {
    const { getByText, getByTestId } = render(
      <ButtonGroup buttons={defaultButtons} onSelectionChange={jest.fn()} />
    );

    expect(getByTestId('button-group')).toBeTruthy();
    expect(getByText('Option 1')).toBeTruthy();
    expect(getByText('Option 2')).toBeTruthy();
    expect(getByText('Option 3')).toBeTruthy();
  });

  it('handles single selection mode', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <ButtonGroup
        buttons={defaultButtons}
        onSelectionChange={onSelectionChange}
        selectionMode="single"
      />
    );

    fireEvent.press(getByText('Option 1'));

    expect(onSelectionChange).toHaveBeenCalledWith(['value1']);
  });

  it('handles multiple selection mode', () => {
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

    expect(onSelectionChange).toHaveBeenCalledWith(['value1']);
    expect(onSelectionChange).toHaveBeenCalledWith(['value1', 'value2']);
  });

  it('deselects items in multiple selection mode', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <ButtonGroup
        buttons={defaultButtons}
        onSelectionChange={onSelectionChange}
        selectionMode="multiple"
        selectedValues={['value1', 'value2']}
      />
    );

    // Press already selected item to deselect
    fireEvent.press(getByText('Option 1'));

    expect(onSelectionChange).toHaveBeenCalledWith(['value2']);
  });

  it('shows selected state correctly', () => {
    const { getByTestId } = render(
      <ButtonGroup
        buttons={defaultButtons}
        onSelectionChange={jest.fn()}
        selectedValues={['value1']}
      />
    );

    const selectedButton = getByTestId('button-option1');
    expect(selectedButton.props.accessibilityState?.selected).toBe(true);
  });

  it('applies disabled state correctly', () => {
    const buttonsWithDisabled = [
      ...defaultButtons,
      {
        id: 'option4',
        title: 'Disabled Option',
        value: 'value4',
        disabled: true,
      },
    ];

    const { getByTestId } = render(
      <ButtonGroup buttons={buttonsWithDisabled} onSelectionChange={jest.fn()} />
    );

    const disabledButton = getByTestId('button-option4');
    expect(disabledButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('prevents interaction with disabled buttons', () => {
    const onSelectionChange = jest.fn();
    const buttonsWithDisabled = [
      {
        id: 'option1',
        title: 'Disabled Option',
        value: 'value1',
        disabled: true,
      },
    ];

    const { getByText } = render(
      <ButtonGroup buttons={buttonsWithDisabled} onSelectionChange={onSelectionChange} />
    );

    fireEvent.press(getByText('Disabled Option'));

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('renders with custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(
      <ButtonGroup
        buttons={defaultButtons}
        onSelectionChange={jest.fn()}
        style={customStyle}
      />
    );

    const buttonGroup = getByTestId('button-group');
    expect(buttonGroup.props.style).toContainEqual(
      expect.objectContaining(customStyle)
    );
  });

  it('renders in vertical layout', () => {
    const { getByTestId } = render(
      <ButtonGroup
        buttons={defaultButtons}
        onSelectionChange={jest.fn()}
        layout="vertical"
      />
    );

    const buttonGroup = getByTestId('button-group');
    expect(buttonGroup.props.style).toContainEqual(
      expect.objectContaining({ flexDirection: 'column' })
    );
  });

  it('renders in horizontal layout by default', () => {
    const { getByTestId } = render(
      <ButtonGroup buttons={defaultButtons} onSelectionChange={jest.fn()} />
    );

    const buttonGroup = getByTestId('button-group');
    expect(buttonGroup.props.style).toContainEqual(
      expect.objectContaining({ flexDirection: 'row' })
    );
  });

  it('handles empty buttons array', () => {
    const { getByTestId, queryByRole } = render(
      <ButtonGroup buttons={[]} onSelectionChange={jest.fn()} />
    );

    expect(getByTestId('button-group')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  });

  it('applies correct accessibility properties', () => {
    const { getByTestId } = render(
      <ButtonGroup buttons={defaultButtons} onSelectionChange={jest.fn()} />
    );

    const buttonGroup = getByTestId('button-group');
    expect(buttonGroup.props.accessibilityRole).toBe('radiogroup');

    const firstButton = getByTestId('button-option1');
    expect(firstButton.props.accessibilityRole).toBe('button');
    expect(firstButton.props.accessibilityLabel).toBe('Option 1');
  });

  it('handles different orientations', () => {
    const orientations = ['horizontal', 'vertical'] as const;

    orientations.forEach(orientation => {
      const { getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={jest.fn()}
          orientation={orientation}
        />
      );

      const firstButton = getByTestId('button-option1');
      expect(firstButton).toBeTruthy();
    });
  });

  it('handles different layouts correctly', () => {
    const layouts = ['horizontal', 'vertical'] as const;

    layouts.forEach(layout => {
      const { getByTestId } = render(
        <ButtonGroup
          buttons={defaultButtons}
          onSelectionChange={jest.fn()}
          layout={layout}
        />
      );

      const firstButton = getByTestId('button-option1');
      expect(firstButton).toBeTruthy();
    });
  });

  it('maintains selection state correctly', () => {
    const onSelectionChange = jest.fn();
    const { getByText, rerender } = render(
      <ButtonGroup
        buttons={defaultButtons}
        onSelectionChange={onSelectionChange}
        selectedValues={[]}
      />
    );

    fireEvent.press(getByText('Option 1'));

    rerender(
      <ButtonGroup
        buttons={defaultButtons}
        onSelectionChange={onSelectionChange}
        selectedValues={['value1']}
      />
    );

    const selectedButton = getByText('Option 1');
    expect(selectedButton.parent?.props.accessibilityState?.selected).toBe(true);
  });

  it('handles rapid successive presses', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <ButtonGroup
        buttons={defaultButtons}
        onSelectionChange={onSelectionChange}
        selectionMode="single"
      />
    );

    const button = getByText('Option 1');

    // Rapid fire presses
    fireEvent.press(button);
    fireEvent.press(button);
    fireEvent.press(button);

    // Should handle debouncing appropriately
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it('handles buttons with icons', () => {
    const buttonsWithIcons = [
      {
        id: 'icon1',
        title: 'Icon Button',
        value: 'iconValue',
        icon: 'star',
      },
    ];

    const { getByText, getByTestId } = render(
      <ButtonGroup buttons={buttonsWithIcons} onSelectionChange={jest.fn()} />
    );

    expect(getByText('Icon Button')).toBeTruthy();
    expect(getByTestId('button-icon1')).toBeTruthy();
  });

  it('handles long button titles gracefully', () => {
    const buttonsWithLongTitles = [
      {
        id: 'long1',
        title: 'This is a very long button title that might overflow',
        value: 'longValue',
      },
    ];

    const { getByText } = render(
      <ButtonGroup buttons={buttonsWithLongTitles} onSelectionChange={jest.fn()} />
    );

    expect(getByText('This is a very long button title that might overflow')).toBeTruthy();
  });

  it('maintains consistent spacing between buttons', () => {
    const { getByTestId } = render(
      <ButtonGroup buttons={defaultButtons} onSelectionChange={jest.fn()} />
    );

    const buttonGroup = getByTestId('button-group');
    expect(buttonGroup.props.style).toContainEqual(
      expect.objectContaining({ gap: expect.any(Number) })
    );
  });
});
import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Text } from 'react-native';
import { ButtonProps } from './Button';

export interface ButtonGroupButton {
  id: string;
  title: string;
  value: string;
  disabled?: boolean;
  icon?: string;
}

const SPACING_MAP: Record<string, number> = {
  xs: 6, sm: 8, md: 16, lg: 20, xl: 24,
};

export interface ButtonGroupProps {
  buttons?: ButtonGroupButton[];
  onSelectionChange?: (selectedValues: string[]) => void;
  selectionMode?: 'single' | 'multiple';
  selectedValues?: string[];
  orientation?: 'horizontal' | 'vertical';
  spacing?: string;
  style?: ViewStyle;
  layout?: 'horizontal' | 'vertical';
  children?: React.ReactElement<ButtonProps>[];
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  buttons,
  onSelectionChange,
  selectionMode = 'single',
  selectedValues = [],
  orientation = 'horizontal',
  spacing = 'sm',
  style,
  layout = 'horizontal',
  children,
}) => {
  const [internalSelectedValues, setInternalSelectedValues] = useState<string[]>(selectedValues);

  const handleButtonPress = (buttonValue: string, disabled?: boolean) => {
    if (disabled || !onSelectionChange) return;

    let newSelectedValues: string[];
    if (selectionMode === 'single') {
      newSelectedValues = [buttonValue];
    } else {
      if (internalSelectedValues.includes(buttonValue)) {
        newSelectedValues = internalSelectedValues.filter(value => value !== buttonValue);
      } else {
        newSelectedValues = [...internalSelectedValues, buttonValue];
      }
    }

    setInternalSelectedValues(newSelectedValues);
    onSelectionChange(newSelectedValues);
  };

  const currentSelectedValues = selectedValues.length > 0 ? selectedValues : internalSelectedValues;

  if (children && !buttons) {
    const spacingValue = SPACING_MAP[spacing] ?? 8;
    const containerStyle: ViewStyle = {
      flexDirection: orientation === 'horizontal' ? 'row' : 'column',
      ...style,
    };

    const renderChildren = () => {
      return React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return null;
        const isLast = index === children.length - 1;
        const marginStyle = !isLast
          ? orientation === 'horizontal'
            ? { marginRight: spacingValue }
            : { marginBottom: spacingValue }
          : {};
        return React.cloneElement(child, {
          ...child.props,
          style: StyleSheet.flatten([child.props.style as ViewStyle, marginStyle]),
        });
      });
    };

    return <View style={containerStyle}>{renderChildren()}</View>;
  }

  if (buttons) {
    const spacingValue = SPACING_MAP[spacing] ?? 8;
    return (
      <View
        style={StyleSheet.flatten([
          styles.container,
          orientation === 'vertical' && styles.verticalContainer,
          { gap: spacingValue },
          style,
        ])}
        testID="button-group"
      >
        {buttons.map((button) => {
          const isSelected = currentSelectedValues.includes(button.value);
          return (
            <TouchableOpacity
              key={button.id}
              style={StyleSheet.flatten([
                styles.button,
                isSelected && styles.selectedButton,
                button.disabled && styles.disabledButton,
              ])}
              onPress={() => handleButtonPress(button.value, button.disabled)}
              disabled={button.disabled}
              testID={`button-${button.id}`}
            >
              <Text style={StyleSheet.flatten([
                styles.buttonText,
                isSelected && styles.selectedButtonText,
                button.disabled && styles.disabledButtonText,
              ])}>
                {button.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return <View style={style} />;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  verticalContainer: {
    flexDirection: 'column',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  selectedButton: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },
  disabledButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EBEBEB',
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#222222',
  },
  selectedButtonText: {
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: '#717171',
  },
});

export default ButtonGroup;

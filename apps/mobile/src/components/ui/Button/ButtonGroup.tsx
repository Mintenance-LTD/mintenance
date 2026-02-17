import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Text } from 'react-native';
import { theme } from '../../../theme';
import { Button, ButtonProps } from './Button';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ButtonGroupButton {
  id: string;
  title: string;
  value: string;
  disabled?: boolean;
  icon?: string;
}

export interface ButtonGroupProps {
  buttons?: ButtonGroupButton[];
  onSelectionChange?: (selectedValues: string[]) => void;
  selectionMode?: 'single' | 'multiple';
  selectedValues?: string[];
  orientation?: 'horizontal' | 'vertical';
  spacing?: keyof typeof theme.spacing;
  style?: ViewStyle;
  layout?: 'horizontal' | 'vertical';
  // Legacy props for backward compatibility
  children?: React.ReactElement<ButtonProps>[];
}

// ============================================================================
// BUTTON GROUP COMPONENT
// ============================================================================

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  buttons,
  onSelectionChange,
  selectionMode = 'single',
  selectedValues = [],
  orientation = 'horizontal',
  spacing = 'sm',
  style,
  layout = 'horizontal',
  children, // Legacy support
}) => {
  const [internalSelectedValues, setInternalSelectedValues] = useState<string[]>(selectedValues);

  const handleButtonPress = (buttonValue: string, disabled?: boolean) => {
    if (disabled || !onSelectionChange) return;

    let newSelectedValues: string[];

    if (selectionMode === 'single') {
      newSelectedValues = [buttonValue];
    } else {
      // Multiple selection mode
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

  // Legacy mode: render children
  if (children && !buttons) {
    const spacingValue = theme.spacing[spacing];

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
          style: StyleSheet.flatten([child.props.style, marginStyle]),
        });
      });
    };

    return <View style={containerStyle}>{renderChildren()}</View>;
  }

  // New mode: render buttons with selection
  if (buttons) {
    return (
      <View
        style={StyleSheet.flatten([
          styles.container,
          orientation === 'vertical' && styles.verticalContainer,
          { gap: theme.spacing[spacing] },
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

  // Fallback
  return <View style={style} />;
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  verticalContainer: {
    flexDirection: 'column',
  },
  button: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  selectedButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  disabledButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.textPrimary,
  },
  selectedButtonText: {
    color: theme.colors.white,
  },
  disabledButtonText: {
    color: theme.colors.textSecondary,
  },
});

export default ButtonGroup;
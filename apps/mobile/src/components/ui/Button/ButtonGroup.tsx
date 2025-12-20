import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Text } from 'react-native';
import { designTokens } from '../../../design-system/tokens';
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
  spacing?: keyof typeof designTokens.spacing;
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
    const spacingValue = designTokens.spacing[spacing];

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
        style={[
          styles.container,
          orientation === 'vertical' && styles.verticalContainer,
          { gap: designTokens.spacing[spacing] },
          style,
        ]}
        testID="button-group"
      >
        {buttons.map((button) => {
          const isSelected = currentSelectedValues.includes(button.value);
          
          return (
            <TouchableOpacity
              key={button.id}
              style={[
                styles.button,
                isSelected && styles.selectedButton,
                button.disabled && styles.disabledButton,
              ]}
              onPress={() => handleButtonPress(button.value, button.disabled)}
              disabled={button.disabled}
              testID={`button-${button.id}`}
            >
              <Text style={[
                styles.buttonText,
                isSelected && styles.selectedButtonText,
                button.disabled && styles.disabledButtonText,
              ]}>
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
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    backgroundColor: designTokens.colors.surface,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  selectedButton: {
    backgroundColor: designTokens.colors.primary,
    borderColor: designTokens.colors.primary,
  },
  disabledButton: {
    backgroundColor: designTokens.colors.surface,
    borderColor: designTokens.colors.border,
    opacity: 0.5,
  },
  buttonText: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: designTokens.typography.body.fontWeight,
    color: designTokens.colors.text,
  },
  selectedButtonText: {
    color: designTokens.colors.white,
  },
  disabledButtonText: {
    color: designTokens.colors.textSecondary,
  },
});

export default ButtonGroup;
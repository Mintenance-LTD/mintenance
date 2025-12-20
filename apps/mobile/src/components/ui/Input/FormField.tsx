import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { designTokens } from '../../../design-system/tokens';
import { Input, InputProps } from './Input';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface FormFieldProps extends InputProps {
  children?: React.ReactNode;
  fieldStyle?: ViewStyle;
}

// ============================================================================
// FORM FIELD COMPONENT
// ============================================================================

export const FormField: React.FC<FormFieldProps> = ({
  children,
  fieldStyle,
  containerStyle,
  ...inputProps
}) => {
  // If children are provided, render custom content instead of Input
  if (children) {
    return (
      <View style={[styles.fieldContainer, fieldStyle]}>
        {children}
      </View>
    );
  }

  // Default behavior: render Input component
  return (
    <Input
      {...inputProps}
      containerStyle={StyleSheet.flatten([styles.fieldContainer, containerStyle])}
    />
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: designTokens.spacing[4],
  },
});

export default FormField;
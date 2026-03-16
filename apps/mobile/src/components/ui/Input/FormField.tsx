import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Input, InputProps } from './Input';

export interface FormFieldProps extends InputProps {
  children?: React.ReactNode;
  fieldStyle?: ViewStyle;
}

export const FormField: React.FC<FormFieldProps> = ({
  children,
  fieldStyle,
  containerStyle,
  ...inputProps
}) => {
  if (children) {
    return <View style={[styles.fieldContainer, fieldStyle]}>{children}</View>;
  }
  return <Input {...inputProps} containerStyle={StyleSheet.flatten([styles.fieldContainer, containerStyle])} />;
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
});

export default FormField;

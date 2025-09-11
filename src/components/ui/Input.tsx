import React, { forwardRef } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { theme } from '../../theme';

type InputVariant = keyof typeof theme.components.input;

export interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle | ViewStyle[];
  variant?: InputVariant;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ containerStyle, style, variant = 'default', ...props }, ref) => {
    const v = theme.components.input[variant] as any;
    return (
      <View style={[styles.container, { borderColor: v?.borderColor, backgroundColor: v?.backgroundColor }, containerStyle]}>
        <TextInput
          ref={ref}
          style={[styles.input, { color: v?.color ?? theme.colors.textPrimary }, style]}
          placeholderTextColor={v?.placeholderTextColor ?? theme.colors.placeholder}
          {...props}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing[4],
    height: theme.layout.inputHeightLarge,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    paddingVertical: theme.spacing[3],
  },
});

export default Input;


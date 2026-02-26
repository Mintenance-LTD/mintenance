import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';

type InputVariant = keyof typeof theme.components.input;

export interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle | ViewStyle[];
  variant?: InputVariant;
  label?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  size?: string;
  fullWidth?: boolean;
  required?: boolean;
  state?: string;
  errorText?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({
    containerStyle,
    style,
    variant = 'default',
    label,
    leftIcon,
    rightIcon,
    onRightIconPress,
    size,
    fullWidth,
    required,
    state,
    errorText,
    ...props
  }, ref) => {
    const hasError = !!errorText;
    const v = hasError
      ? (theme.components.input.error as Record<string, unknown>)
      : (theme.components.input[variant] as Record<string, unknown>);
    return (
      <View style={containerStyle}>
        <View
          style={[
            styles.container,
            { borderColor: v?.borderColor, backgroundColor: v?.backgroundColor },
          ]}
        >
          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: v?.color ?? theme.colors.textPrimary },
              style,
            ]}
            placeholderTextColor={
              v?.placeholderTextColor ?? theme.colors.placeholder
            }
            {...props}
          />
        </View>
        {hasError && (
          <Text style={styles.errorText}>{errorText}</Text>
        )}
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
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.accent || '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default Input;

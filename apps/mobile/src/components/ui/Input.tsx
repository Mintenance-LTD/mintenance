import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';

type InputVariant = 'default' | 'outline' | 'error' | 'filled' | 'underline';

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

const VARIANT_STYLES: Record<InputVariant, { borderColor: string; backgroundColor: string; color: string; placeholderTextColor: string }> = {
  default: { borderColor: '#EBEBEB', backgroundColor: '#F7F7F7', color: '#222222', placeholderTextColor: '#B0B0B0' },
  outline: { borderColor: '#EBEBEB', backgroundColor: '#FFFFFF', color: '#222222', placeholderTextColor: '#B0B0B0' },
  error: { borderColor: '#EF4444', backgroundColor: '#FEF2F2', color: '#222222', placeholderTextColor: '#B0B0B0' },
  filled: { borderColor: 'transparent', backgroundColor: '#F0F0F0', color: '#222222', placeholderTextColor: '#B0B0B0' },
  underline: { borderColor: '#EBEBEB', backgroundColor: 'transparent', color: '#222222', placeholderTextColor: '#B0B0B0' },
};

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
    const v = hasError ? VARIANT_STYLES.error : VARIANT_STYLES[variant] ?? VARIANT_STYLES.default;
    return (
      <View style={containerStyle}>
        <View
          style={[
            styles.container,
            { borderColor: v.borderColor, backgroundColor: v.backgroundColor },
          ]}
        >
          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: v.color },
              style,
            ]}
            placeholderTextColor={v.placeholderTextColor}
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
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default Input;

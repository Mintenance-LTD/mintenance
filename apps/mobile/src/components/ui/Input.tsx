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
import { me } from '../../design-system/mint-editorial';

type InputVariant = 'default' | 'outline' | 'error' | 'filled' | 'underline';

interface InputProps extends TextInputProps {
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
  /**
   * Opt in to the Direction A · Mint Editorial palette. Off by default
   * so existing callers render unchanged.
   */
  mint?: boolean;
}

// Mint Editorial field palette — see design-system/mint-editorial.ts.
const MINT_FIELD = {
  borderColor: me.line,
  backgroundColor: me.surface,
  color: me.ink,
  placeholderTextColor: me.ink4,
};
const MINT_FIELD_ERROR = {
  borderColor: me.errFg,
  backgroundColor: me.errBg,
  color: me.ink,
  placeholderTextColor: me.ink4,
};

const VARIANT_STYLES: Record<
  InputVariant,
  {
    borderColor: string;
    backgroundColor: string;
    color: string;
    placeholderTextColor: string;
  }
> = {
  default: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
    color: theme.colors.textPrimary,
    placeholderTextColor: theme.colors.textTertiary,
  },
  outline: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    placeholderTextColor: theme.colors.textTertiary,
  },
  error: {
    borderColor: theme.colors.error,
    backgroundColor: '#FEF2F2',
    color: theme.colors.textPrimary,
    placeholderTextColor: theme.colors.textTertiary,
  },
  filled: {
    borderColor: 'transparent',
    backgroundColor: theme.colors.backgroundTertiary,
    color: theme.colors.textPrimary,
    placeholderTextColor: theme.colors.textTertiary,
  },
  underline: {
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
    color: theme.colors.textPrimary,
    placeholderTextColor: theme.colors.textTertiary,
  },
};

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
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
      mint = false,
      ...props
    },
    ref
  ) => {
    const hasError = !!errorText;
    const v = mint
      ? hasError
        ? MINT_FIELD_ERROR
        : MINT_FIELD
      : hasError
        ? VARIANT_STYLES.error
        : (VARIANT_STYLES[variant] ?? VARIANT_STYLES.default);
    return (
      <View style={containerStyle}>
        <View
          style={[
            styles.container,
            mint && { borderRadius: me.radius.input },
            { borderColor: v.borderColor, backgroundColor: v.backgroundColor },
          ]}
        >
          <TextInput
            ref={ref}
            style={[styles.input, { color: v.color }, style]}
            placeholderTextColor={v.placeholderTextColor}
            {...props}
          />
        </View>
        {hasError && (
          <Text style={[styles.errorText, mint && { color: me.errFg }]}>
            {errorText}
          </Text>
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
    color: theme.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});

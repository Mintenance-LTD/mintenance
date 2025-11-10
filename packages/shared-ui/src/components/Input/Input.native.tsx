/**
 * Input Component - Native Implementation
 * 
 * React Native-specific Input component using design tokens
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import type { ComponentRef } from 'react';
import { mobileTokens } from '@mintenance/design-tokens';
import type { NativeInputProps, InputSize } from './types';

/**
 * Input Component for React Native
 * 
 * Uses design tokens for consistent styling across platforms
 */
export const Input = React.forwardRef<TextInput, NativeInputProps>(
  (
    {
      value,
      defaultValue,
      placeholder,
      type = 'text',
      size = 'md',
      disabled = false,
      readOnly = false,
      required = false,
      autoFocus = false,
      label,
      helperText,
      errorText,
      successText,
      leftIcon,
      rightIcon,
      error = false,
      success = false,
      onChangeText,
      onBlur,
      onFocus,
      accessibilityLabel,
      accessibilityHint,
      testID,
      style,
      inputStyle,
      containerStyle,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const hasError = error || !!errorText;
    const hasSuccess = success || !!successText;
    const showHelperText = helperText || errorText || successText;

    // Size styles
    const sizeStyles: Record<InputSize, { padding: number; fontSize: number; minHeight: number }> = {
      sm: {
        padding: mobileTokens.spacing.md,
        fontSize: mobileTokens.typography.rawFontSize.sm,
        minHeight: 32,
      },
      md: {
        padding: mobileTokens.spacing.lg,
        fontSize: mobileTokens.typography.rawFontSize.base,
        minHeight: 40,
      },
      lg: {
        padding: mobileTokens.spacing.xl,
        fontSize: mobileTokens.typography.rawFontSize.base,
        minHeight: 48,
      },
    };

    // Base styles
    const baseInputStyle: TextStyle = {
      flex: 1,
      borderRadius: mobileTokens.borderRadius.md,
      borderWidth: 1,
      borderColor: hasError ? mobileTokens.colors.error : hasSuccess ? mobileTokens.colors.success : mobileTokens.colors.border,
      backgroundColor: disabled ? mobileTokens.colors.gray100 : mobileTokens.colors.white,
      color: mobileTokens.colors.textPrimary,
      ...sizeStyles[size],
    };

    // Focus styles
    const focusInputStyle: TextStyle = isFocused && !disabled
      ? {
          borderColor: hasError ? mobileTokens.colors.error : hasSuccess ? mobileTokens.colors.success : mobileTokens.colors.primary,
        }
      : {};

    return (
      <View style={[styles.container, containerStyle as ViewStyle]}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && (
              <Text style={{ color: mobileTokens.colors.error }}> *</Text>
            )}
          </Text>
        )}

        <View style={styles.inputWrapper}>
          {leftIcon && (
            <View style={styles.leftIcon}>
              {leftIcon}
            </View>
          )}

          <TextInput
            ref={ref}
            value={value}
            defaultValue={defaultValue}
            placeholder={placeholder}
            placeholderTextColor={mobileTokens.colors.textSecondary}
            editable={!disabled && !readOnly}
            autoFocus={autoFocus}
            keyboardType={type === 'email' ? 'email-address' : type === 'number' ? 'numeric' : type === 'tel' ? 'phone-pad' : 'default'}
            secureTextEntry={type === 'password'}
            onChangeText={onChangeText}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            style={StyleSheet.flatten([
              baseInputStyle,
              focusInputStyle,
              leftIcon && { paddingLeft: mobileTokens.spacing.xl * 2 },
              rightIcon && { paddingRight: mobileTokens.spacing.xl * 2 },
              inputStyle as TextStyle | undefined,
            ]) as TextStyle}
            accessibilityLabel={accessibilityLabel || label}
            accessibilityHint={accessibilityHint}
            testID={testID}
          />

          {rightIcon && (
            <View style={styles.rightIcon}>
              {rightIcon}
            </View>
          )}
        </View>

        {showHelperText && (
          <Text
            style={[
              styles.helperText,
              errorText && { color: mobileTokens.colors.error },
              successText && { color: mobileTokens.colors.success },
            ]}
          >
            {errorText || successText || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: mobileTokens.typography.rawFontSize.sm,
    fontWeight: mobileTokens.typography.fontWeight.semibold,
    color: mobileTokens.colors.textPrimary,
    marginBottom: mobileTokens.spacing.sm,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    position: 'absolute',
    left: mobileTokens.spacing.md,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: mobileTokens.spacing.md,
    zIndex: 1,
  },
  helperText: {
    marginTop: mobileTokens.spacing.xs,
    fontSize: mobileTokens.typography.rawFontSize.xs,
    color: mobileTokens.colors.textSecondary,
  },
});

export default Input;


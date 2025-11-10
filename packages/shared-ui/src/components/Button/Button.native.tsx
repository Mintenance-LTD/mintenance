/**
 * Button Component - Native Implementation
 * 
 * React Native-specific Button component using design tokens
 */

import React, { forwardRef, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
  AccessibilityRole,
  Animated,
} from 'react-native';
import type { ComponentRef } from 'react';
import { mobileTokens } from '@mintenance/design-tokens';
import type { NativeButtonProps } from './types';

/**
 * Button Component for React Native
 * 
 * Uses design tokens for consistent styling across platforms
 */
export const Button = forwardRef<ComponentRef<typeof TouchableOpacity>, NativeButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      disabled = false,
      loading = false,
      leftIcon,
      rightIcon,
      onPress,
      onLongPress,
      hapticFeedback = true,
      accessibilityLabel,
      accessibilityHint,
      accessibilityRole = 'button',
      testID,
      style,
      textStyle,
    },
    ref
  ) => {
    const [pressAnimation] = useState(new Animated.Value(1));
    const [isPressed, setIsPressed] = useState(false);

    const isDisabled = disabled || loading;

    // Get button styles using design tokens
    const buttonStyles = getButtonStyles(variant, size, fullWidth, isDisabled, isPressed);
    const textStyles = getTextStyles(variant, size, isDisabled);

    const handlePressIn = () => {
      if (isDisabled) return;
      setIsPressed(true);
      Animated.spring(pressAnimation, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    const handlePressOut = () => {
      setIsPressed(false);
      Animated.spring(pressAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    const handlePress = () => {
      if (isDisabled) return;
      onPress?.();
    };

    const renderContent = () => {
      if (loading) {
        return (
          <View style={styles.contentContainer}>
            <ActivityIndicator
              size="small"
              color={getTextColor(variant, isDisabled)}
              style={{ marginRight: mobileTokens.spacing.sm }}
            />
            <Text style={[textStyles, textStyle as TextStyle]} numberOfLines={1}>
              {typeof children === 'string' ? children : 'Loading...'}
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.contentContainer}>
          {leftIcon && <View style={{ marginRight: mobileTokens.spacing.sm }}>{leftIcon}</View>}
          <Text style={[textStyles, textStyle as TextStyle]} numberOfLines={1}>
            {children}
          </Text>
          {rightIcon && <View style={{ marginLeft: mobileTokens.spacing.sm }}>{rightIcon}</View>}
        </View>
      );
    };

    return (
      <Animated.View
        style={[
          { transform: [{ scale: pressAnimation }] },
          fullWidth && { width: '100%' },
        ]}
      >
        <TouchableOpacity
          ref={ref}
          style={[buttonStyles, style as ViewStyle]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={onLongPress}
          disabled={isDisabled}
          activeOpacity={1}
          accessibilityRole={accessibilityRole}
          accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
          accessibilityHint={accessibilityHint}
          accessibilityState={{
            disabled: isDisabled,
            busy: loading,
            selected: isPressed,
          }}
          testID={testID}
        >
          {renderContent()}
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

Button.displayName = 'Button';

// Style functions using design tokens
const getButtonStyles = (
  variant: string,
  size: string,
  fullWidth: boolean,
  disabled: boolean,
  isPressed: boolean
): ViewStyle => {
  const baseStyle: ViewStyle = {
    borderRadius: mobileTokens.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44, // WCAG minimum touch target
    minWidth: 44,
    overflow: 'hidden',
  };

  if (fullWidth) {
    baseStyle.width = '100%';
  }

  // Size padding
  const sizePadding = {
    sm: { paddingHorizontal: mobileTokens.spacing.md, paddingVertical: mobileTokens.spacing.sm },
    md: { paddingHorizontal: mobileTokens.spacing.lg, paddingVertical: mobileTokens.spacing.md },
    lg: { paddingHorizontal: mobileTokens.spacing.xl, paddingVertical: mobileTokens.spacing.lg },
    xl: { paddingHorizontal: mobileTokens.spacing['2xl'], paddingVertical: mobileTokens.spacing.xl },
  };

  // Variant styles
  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: disabled ? mobileTokens.colors.gray400 : mobileTokens.colors.primary,
      ...mobileTokens.shadows.sm,
    },
    secondary: {
      backgroundColor: disabled ? mobileTokens.colors.gray200 : mobileTokens.colors.secondary,
      ...mobileTokens.shadows.sm,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: disabled ? mobileTokens.colors.gray300 : mobileTokens.colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: disabled ? mobileTokens.colors.gray400 : mobileTokens.colors.error,
      ...mobileTokens.shadows.sm,
    },
    success: {
      backgroundColor: disabled ? mobileTokens.colors.gray400 : mobileTokens.colors.success,
      ...mobileTokens.shadows.sm,
    },
  };

  return {
    ...baseStyle,
    ...sizePadding[size as keyof typeof sizePadding],
    ...variantStyles[variant],
    opacity: disabled ? 0.6 : 1,
  };
};

const getTextStyles = (variant: string, size: string, disabled: boolean): TextStyle => {
  const baseStyle: TextStyle = {
    fontSize: mobileTokens.typography.rawFontSize[size === 'sm' ? 'sm' : size === 'xl' ? 'lg' : 'base'],
    fontWeight: mobileTokens.typography.fontWeight.semibold,
    textAlign: 'center',
  };

  const textColors: Record<string, string> = {
    primary: mobileTokens.colors.white,
    secondary: mobileTokens.colors.white,
    outline: disabled ? mobileTokens.colors.gray500 : mobileTokens.colors.primary,
    ghost: disabled ? mobileTokens.colors.gray500 : mobileTokens.colors.textPrimary,
    danger: mobileTokens.colors.white,
    success: mobileTokens.colors.white,
  };

  return {
    ...baseStyle,
    color: textColors[variant] || mobileTokens.colors.textPrimary,
  };
};

const getTextColor = (variant: string, disabled: boolean): string => {
  if (disabled) return mobileTokens.colors.gray500;
  
  const colors: Record<string, string> = {
    primary: mobileTokens.colors.white,
    secondary: mobileTokens.colors.white,
    outline: mobileTokens.colors.primary,
    ghost: mobileTokens.colors.textPrimary,
    danger: mobileTokens.colors.white,
    success: mobileTokens.colors.white,
  };
  
  return colors[variant] || mobileTokens.colors.textPrimary;
};

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Button;


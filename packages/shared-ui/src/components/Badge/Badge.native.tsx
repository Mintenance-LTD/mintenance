/**
 * Badge Component - Native Implementation
 * 
 * React Native-specific Badge component using design tokens
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { mobileTokens } from '@mintenance/design-tokens';
import type { NativeBadgeProps, BadgeVariant, BadgeSize } from './types';

/**
 * Badge Component for React Native
 * 
 * Uses design tokens for consistent styling across platforms
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  showIcon = false,
  accessibilityLabel,
  testID,
  style,
  textStyle,
}: NativeBadgeProps) {
  // Size styles
  const sizeStyles: Record<BadgeSize, { paddingHorizontal: number; paddingVertical: number; fontSize: number; minHeight: number }> = {
    sm: {
      paddingHorizontal: mobileTokens.spacing.sm,
      paddingVertical: mobileTokens.spacing.xs,
      fontSize: mobileTokens.typography.rawFontSize.xs,
      minHeight: 20,
    },
    md: {
      paddingHorizontal: mobileTokens.spacing.md,
      paddingVertical: mobileTokens.spacing.sm,
      fontSize: mobileTokens.typography.rawFontSize.sm,
      minHeight: 24,
    },
    lg: {
      paddingHorizontal: mobileTokens.spacing.lg,
      paddingVertical: mobileTokens.spacing.md,
      fontSize: mobileTokens.typography.rawFontSize.base,
      minHeight: 28,
    },
  };

  // Variant styles
  const getVariantStyles = (): { backgroundColor: string; borderColor: string; textColor: string } => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: mobileTokens.colors.success + '20',
          borderColor: mobileTokens.colors.success + '40',
          textColor: mobileTokens.colors.success,
        };
      case 'warning':
        return {
          backgroundColor: mobileTokens.colors.warning + '20',
          borderColor: mobileTokens.colors.warning + '40',
          textColor: mobileTokens.colors.warning,
        };
      case 'error':
        return {
          backgroundColor: mobileTokens.colors.error + '20',
          borderColor: mobileTokens.colors.error + '40',
          textColor: mobileTokens.colors.error,
        };
      case 'info':
        return {
          backgroundColor: mobileTokens.colors.primary + '20',
          borderColor: mobileTokens.colors.primary + '40',
          textColor: mobileTokens.colors.primary,
        };
      default:
        return {
          backgroundColor: mobileTokens.colors.gray100,
          borderColor: mobileTokens.colors.border,
          textColor: mobileTokens.colors.textPrimary,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyle = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
          minHeight: sizeStyle.minHeight,
        },
        style as ViewStyle,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      testID={testID}
    >
      {(showIcon || icon) && icon && (
        <View style={styles.icon}>
          {icon}
        </View>
      )}
      <Text
        style={[
          styles.text,
          {
            fontSize: sizeStyle.fontSize,
            color: variantStyles.textColor,
          },
          textStyle as TextStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: mobileTokens.borderRadius.full,
    borderWidth: 1,
    fontWeight: mobileTokens.typography.fontWeight.semibold,
  },
  icon: {
    marginRight: mobileTokens.spacing.xs,
  },
  text: {
    fontWeight: mobileTokens.typography.fontWeight.semibold,
  },
});

export default Badge;


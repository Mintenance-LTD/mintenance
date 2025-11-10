/**
 * Card Component - Native Implementation
 * 
 * React Native-specific Card component using design tokens
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import type { ComponentRef } from 'react';
import { mobileTokens } from '@mintenance/design-tokens';
import type { NativeCardProps, CardVariant, CardPadding } from './types';

/**
 * Card Component for React Native
 * 
 * Uses design tokens for consistent styling across platforms
 */
export const Card = React.forwardRef<View, NativeCardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      disabled = false,
      interactive = false,
      onPress,
      onLongPress,
      activeOpacity = 0.7,
      accessibilityLabel,
      accessibilityHint,
      accessibilityRole,
      testID,
      style,
    },
    ref
  ) => {
    const [scaleAnimation] = useState(new Animated.Value(1));
    const [isPressed, setIsPressed] = useState(false);

    const cardStyles = getCardStyles(variant, padding, interactive, disabled, isPressed);

    const handlePressIn = () => {
      if (disabled) return;
      setIsPressed(true);
      Animated.spring(scaleAnimation, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    const handlePressOut = () => {
      setIsPressed(false);
      Animated.spring(scaleAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    // Render as TouchableOpacity if interactive
    if (interactive || onPress || onLongPress) {
      return (
        <Animated.View
          ref={ref as any}
          style={[
            { transform: [{ scale: scaleAnimation }] },
          ]}
        >
          <TouchableOpacity
            style={[cardStyles, style as ViewStyle]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={onLongPress}
            disabled={disabled}
            activeOpacity={1}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityRole={accessibilityRole === 'article' ? undefined : (accessibilityRole === 'none' ? undefined : accessibilityRole) || 'button'}
            accessibilityState={{ disabled, selected: isPressed }}
            testID={testID}
          >
            {children}
          </TouchableOpacity>
        </Animated.View>
      );
    }

    // Render as regular View
    return (
      <View
        ref={ref}
        style={[cardStyles, style as ViewStyle]}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole === 'article' ? undefined : (accessibilityRole === 'none' ? undefined : accessibilityRole)}
        testID={testID}
      >
        {children}
      </View>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
export interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => (
  <View style={[styles.header, style]}>
    {children}
  </View>
);

export interface CardBodyProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, style }) => (
  <View style={[styles.body, style]}>
    {children}
  </View>
);

export interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => (
  <View style={[styles.footer, style]}>
    {children}
  </View>
);

// Style functions using design tokens
const getCardStyles = (
  variant: CardVariant,
  padding: CardPadding,
  interactive: boolean,
  disabled: boolean,
  isPressed: boolean
): ViewStyle => {
  const baseStyle: ViewStyle = {
    borderRadius: mobileTokens.borderRadius.xl,
    overflow: 'hidden',
  };

  // Add padding
  if (padding !== 'none') {
    const paddingMap: Record<Exclude<CardPadding, 'none'>, number> = {
      sm: mobileTokens.spacing.md,
      md: mobileTokens.spacing.lg,
      lg: mobileTokens.spacing.xl,
    };
    baseStyle.padding = paddingMap[padding];
  }

  // Apply variant styles
  switch (variant) {
    case 'default':
      return {
        ...baseStyle,
        backgroundColor: mobileTokens.colors.white,
        borderWidth: 1,
        borderColor: mobileTokens.colors.border,
        ...mobileTokens.shadows.sm,
        opacity: disabled ? 0.6 : 1,
      };

    case 'elevated':
      return {
        ...baseStyle,
        backgroundColor: mobileTokens.colors.white,
        borderWidth: 1,
        borderColor: mobileTokens.colors.border,
        ...(isPressed ? mobileTokens.shadows.lg : mobileTokens.shadows.base),
        opacity: disabled ? 0.6 : 1,
      };

    case 'outlined':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: mobileTokens.colors.border,
        opacity: disabled ? 0.6 : 1,
      };

    default:
      return baseStyle;
  }
};

const styles = StyleSheet.create({
  header: {
    marginBottom: mobileTokens.spacing.md,
    paddingBottom: mobileTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: mobileTokens.colors.border,
  },
  body: {
    flex: 1,
  },
  footer: {
    marginTop: mobileTokens.spacing.md,
    paddingTop: mobileTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: mobileTokens.colors.border,
  },
});

export default Card;


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
import { Ionicons } from '@expo/vector-icons';
import { designTokens } from '../../../design-system/tokens';
import { useHaptics } from '../../../utils/haptics';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export type ButtonIconPosition = 'left' | 'right';

export interface ButtonProps {
  // Content
  children: React.ReactNode;

  // Variants & styling
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;

  // States
  disabled?: boolean;
  loading?: boolean;

  // Icons
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;

  // Behavior
  onPress?: () => void;
  onLongPress?: () => void;
  hapticFeedback?: boolean;

  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;

  // Style overrides
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

export const Button = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
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
      iconSize,
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
    const haptics = useHaptics();
    const [pressAnimation] = useState(new Animated.Value(1));
    const [isPressed, setIsPressed] = useState(false);

    // ========================================================================
    // COMPUTED STYLES
    // ========================================================================

    const buttonStyles = getButtonStyles(variant, size, fullWidth, disabled, loading);
    const textStyles = getTextStyles(variant, size, disabled);
    const iconColor = getIconColor(variant, disabled);
    const computedIconSize = iconSize || designTokens.componentSizes.icon[size === 'sm' ? 'sm' : 'md'];

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    const handlePressIn = () => {
      if (disabled || loading) return;

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
      if (disabled || loading) return;

      if (hapticFeedback) {
        haptics.light();
      }

      onPress?.();
    };

    const handleLongPress = () => {
      if (disabled || loading) return;

      if (hapticFeedback) {
        haptics.medium();
      }

      onLongPress?.();
    };

    // ========================================================================
    // RENDER CONTENT
    // ========================================================================

    const renderIcon = (iconName: keyof typeof Ionicons.glyphMap, position: ButtonIconPosition) => (
      <Ionicons
        name={iconName}
        size={computedIconSize}
        color={iconColor}
        style={[
          position === 'left' && { marginRight: designTokens.spacing[2] },
          position === 'right' && { marginLeft: designTokens.spacing[2] },
        ]}
      />
    );

    const renderContent = () => {
      if (loading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="small"
              color={iconColor}
              style={{ marginRight: designTokens.spacing[2] }}
            />
            <Text style={[textStyles, textStyle]} numberOfLines={1}>
              {typeof children === 'string' ? children : 'Loading...'}
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.contentContainer}>
          {leftIcon && renderIcon(leftIcon, 'left')}
          <Text style={[textStyles, textStyle]} numberOfLines={1}>
            {children}
          </Text>
          {rightIcon && renderIcon(rightIcon, 'right')}
        </View>
      );
    };

    // ========================================================================
    // RENDER COMPONENT
    // ========================================================================

    return (
      <Animated.View
        style={[
          { transform: [{ scale: pressAnimation }] },
          fullWidth && { width: '100%' },
        ]}
      >
        <TouchableOpacity
          ref={ref}
          style={[buttonStyles, style]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={handleLongPress}
          disabled={disabled || loading}
          activeOpacity={1}
          accessibilityRole={accessibilityRole}
          accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
          accessibilityHint={accessibilityHint}
          accessibilityState={{
            disabled: disabled || loading,
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

// ============================================================================
// STYLE FUNCTIONS
// ============================================================================

const getButtonStyles = (
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
  disabled: boolean,
  loading: boolean
): ViewStyle => {
  const baseStyle: ViewStyle = {
    ...designTokens.componentSizes.button[size],
    borderRadius: designTokens.borderRadius.xl, // More rounded for modern look
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: designTokens.accessibility.minTouchTarget.width,
    minHeight: designTokens.accessibility.minTouchTarget.height,
    overflow: 'hidden', // For ripple effect
  };

  if (fullWidth) {
    baseStyle.width = '100%';
  }

  // Variant-specific styles with enhanced Material Design 3 patterns
  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor: disabled || loading
          ? designTokens.semanticColors.interactive.primaryDisabled
          : designTokens.semanticColors.interactive.primary,
        ...designTokens.shadows.md, // Enhanced shadow
        // State overlay for pressed state
        ...(disabled || loading ? {} : {
          // Subtle state layer effect
        }),
      };

    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: disabled || loading
          ? designTokens.semanticColors.interactive.secondaryDisabled
          : designTokens.colors.secondary[50], // Lighter tinted background
        borderWidth: 1,
        borderColor: disabled || loading
          ? designTokens.colors.neutral[200]
          : designTokens.semanticColors.interactive.secondary,
        ...designTokens.shadows.sm,
      };

    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1.5, // Slightly thicker border
        borderColor: disabled || loading
          ? designTokens.semanticColors.border.primary
          : designTokens.semanticColors.interactive.primary,
      };

    case 'ghost':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderRadius: designTokens.borderRadius.lg, // Slightly less rounded
      };

    case 'danger':
      return {
        ...baseStyle,
        backgroundColor: disabled || loading
          ? designTokens.colors.neutral[200]
          : designTokens.colors.error[500],
        ...designTokens.shadows.md,
      };

    case 'success':
      return {
        ...baseStyle,
        backgroundColor: disabled || loading
          ? designTokens.colors.neutral[200]
          : designTokens.colors.success[500],
        ...designTokens.shadows.md,
      };

    default:
      return baseStyle;
  }
};

const getTextStyles = (
  variant: ButtonVariant,
  size: ButtonSize,
  disabled: boolean
): TextStyle => {
  const baseStyle: TextStyle = {
    fontSize: designTokens.componentSizes.button[size].fontSize,
    fontWeight: designTokens.typography.fontWeight.semibold,
    textAlign: 'center',
  };

  // Variant-specific text colors
  switch (variant) {
    case 'primary':
    case 'secondary':
    case 'danger':
    case 'success':
      return {
        ...baseStyle,
        color: disabled
          ? designTokens.semanticColors.text.disabled
          : designTokens.semanticColors.text.inverse,
      };

    case 'outline':
    case 'ghost':
      return {
        ...baseStyle,
        color: disabled
          ? designTokens.semanticColors.text.disabled
          : variant === 'outline'
          ? designTokens.semanticColors.interactive.primary
          : designTokens.semanticColors.text.primary,
      };

    default:
      return baseStyle;
  }
};

const getIconColor = (variant: ButtonVariant, disabled: boolean): string => {
  if (disabled) {
    return designTokens.semanticColors.text.disabled;
  }

  switch (variant) {
    case 'primary':
    case 'secondary':
    case 'danger':
    case 'success':
      return designTokens.semanticColors.text.inverse;

    case 'outline':
      return designTokens.semanticColors.interactive.primary;

    case 'ghost':
      return designTokens.semanticColors.text.primary;

    default:
      return designTokens.semanticColors.text.primary;
  }
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Button;
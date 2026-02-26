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
import { theme } from '../../../theme';
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
// BUTTON SIZE PRESETS (replaces old componentSizes.button)
// ============================================================================

const BUTTON_SIZES = {
  sm: { height: 36, paddingHorizontal: 16, fontSize: theme.typography.fontSize.sm },
  md: { height: 48, paddingHorizontal: 20, fontSize: theme.typography.fontSize.base },
  lg: { height: 52, paddingHorizontal: 28, fontSize: theme.typography.fontSize.lg },
  xl: { height: 56, paddingHorizontal: 32, fontSize: theme.typography.fontSize.xl },
};

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
    const computedIconSize = iconSize || (size === 'sm' ? 16 : 20);

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    const handlePressIn = () => {
      if (disabled || loading) return;

      setIsPressed(true);
      Animated.spring(pressAnimation, {
        toValue: 0.97,
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
          position === 'left' && { marginRight: theme.spacing[2] },
          position === 'right' && { marginLeft: theme.spacing[2] },
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
              style={{ marginRight: theme.spacing[2] }}
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
    ...BUTTON_SIZES[size],
    borderRadius: theme.borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: theme.layout.minTouchTarget,
    minHeight: theme.layout.minTouchTarget,
    overflow: 'hidden',
  };

  if (fullWidth) {
    baseStyle.width = '100%';
  }

  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor: disabled || loading
          ? '#DDDDDD'
          : theme.colors.primary,
        ...theme.shadows.sm,
      };

    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled || loading
          ? '#DDDDDD'
          : '#DDDDDD',
      };

    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled || loading
          ? theme.colors.border
          : theme.colors.primary,
      };

    case 'ghost':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
      };

    case 'danger':
      return {
        ...baseStyle,
        backgroundColor: disabled || loading
          ? '#DDDDDD'
          : theme.colors.error,
        ...theme.shadows.sm,
      };

    case 'success':
      return {
        ...baseStyle,
        backgroundColor: disabled || loading
          ? '#DDDDDD'
          : theme.colors.success,
        ...theme.shadows.sm,
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
    fontSize: BUTTON_SIZES[size].fontSize,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  };

  switch (variant) {
    case 'primary':
    case 'danger':
    case 'success':
      return {
        ...baseStyle,
        color: disabled
          ? theme.colors.placeholder
          : '#FFFFFF',
      };

    case 'secondary':
      return {
        ...baseStyle,
        color: disabled
          ? theme.colors.placeholder
          : theme.colors.textPrimary,
      };

    case 'outline':
    case 'ghost':
      return {
        ...baseStyle,
        color: disabled
          ? theme.colors.placeholder
          : variant === 'outline'
          ? theme.colors.primary
          : theme.colors.textPrimary,
      };

    default:
      return baseStyle;
  }
};

const getIconColor = (variant: ButtonVariant, disabled: boolean): string => {
  if (disabled) {
    return theme.colors.placeholder;
  }

  switch (variant) {
    case 'primary':
    case 'danger':
    case 'success':
      return '#FFFFFF';

    case 'secondary':
      return theme.colors.textPrimary;

    case 'outline':
      return theme.colors.primary;

    case 'ghost':
      return theme.colors.textPrimary;

    default:
      return theme.colors.textPrimary;
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

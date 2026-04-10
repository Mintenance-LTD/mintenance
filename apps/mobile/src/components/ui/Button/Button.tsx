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
  StyleProp,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHaptics } from '../../../utils/haptics';
import { theme } from '../../../theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

type ButtonIconPosition = 'left' | 'right';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  iconSize?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
}

const BUTTON_SIZES = {
  sm: { height: 36, paddingHorizontal: 16, fontSize: 13 },
  md: { height: 48, paddingHorizontal: 20, fontSize: 15 },
  lg: { height: 52, paddingHorizontal: 28, fontSize: 18 },
  xl: { height: 56, paddingHorizontal: 32, fontSize: 20 },
};

export const Button = forwardRef<
  React.ElementRef<typeof TouchableOpacity>,
  ButtonProps
>(
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

    const buttonStyles = getButtonStyles(
      variant,
      size,
      fullWidth,
      disabled,
      loading
    );
    const textStyles = getTextStyles(variant, size, disabled);
    const iconColor = getIconColor(variant, disabled);
    const computedIconSize = iconSize || (size === 'sm' ? 16 : 20);

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
      if (hapticFeedback) haptics.light();
      onPress?.();
    };

    const handleLongPress = () => {
      if (disabled || loading) return;
      if (hapticFeedback) haptics.medium();
      onLongPress?.();
    };

    const renderIcon = (iconName: string, position: ButtonIconPosition) => (
      <Ionicons
        name={iconName as React.ComponentProps<typeof Ionicons>['name']}
        size={computedIconSize}
        color={iconColor}
        style={[
          position === 'left' && { marginRight: 8 },
          position === 'right' && { marginLeft: 8 },
        ]}
      />
    );

    const renderContent = () => {
      if (loading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size='small'
              color={iconColor}
              style={{ marginRight: 8 }}
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
          accessibilityLabel={
            accessibilityLabel ||
            (typeof children === 'string' ? children : undefined)
          }
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

const getButtonStyles = (
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
  disabled: boolean,
  loading: boolean
): ViewStyle => {
  const baseStyle: ViewStyle = {
    ...BUTTON_SIZES[size],
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 44,
    minHeight: 44,
    overflow: 'hidden',
  };

  if (fullWidth) baseStyle.width = '100%';

  const shadow = Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
    },
    android: { elevation: 2 },
  });

  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor:
          disabled || loading ? theme.colors.border : theme.colors.textPrimary,
        ...shadow,
      };
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
      };
    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor:
          disabled || loading ? theme.colors.border : theme.colors.textPrimary,
      };
    case 'ghost':
      return { ...baseStyle, backgroundColor: 'transparent' };
    case 'danger':
      return {
        ...baseStyle,
        backgroundColor:
          disabled || loading ? theme.colors.border : theme.colors.error,
        ...shadow,
      };
    case 'success':
      return {
        ...baseStyle,
        backgroundColor:
          disabled || loading ? theme.colors.border : theme.colors.primary,
        ...shadow,
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
    fontWeight: '600',
    textAlign: 'center',
  };

  switch (variant) {
    case 'primary':
    case 'danger':
    case 'success':
      return {
        ...baseStyle,
        color: disabled ? theme.colors.textTertiary : theme.colors.textInverse,
      };
    case 'secondary':
      return {
        ...baseStyle,
        color: disabled ? theme.colors.textTertiary : theme.colors.textPrimary,
      };
    case 'outline':
    case 'ghost':
      return {
        ...baseStyle,
        color: disabled ? theme.colors.textTertiary : theme.colors.textPrimary,
      };
    default:
      return baseStyle;
  }
};

const getIconColor = (variant: ButtonVariant, disabled: boolean): string => {
  if (disabled) return theme.colors.textTertiary;
  switch (variant) {
    case 'primary':
    case 'danger':
    case 'success':
      return theme.colors.surface;
    case 'outline':
    case 'secondary':
    case 'ghost':
    default:
      return theme.colors.textPrimary;
  }
};

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

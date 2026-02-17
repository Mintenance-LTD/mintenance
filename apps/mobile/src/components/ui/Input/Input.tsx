import React, { forwardRef, useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'outline' | 'filled' | 'underline';
export type InputState = 'default' | 'error' | 'success' | 'disabled';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  // Styling
  size?: InputSize;
  variant?: InputVariant;
  state?: InputState;
  fullWidth?: boolean;

  // Label and help text
  label?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;

  // Icons
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;

  // Container styling
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;

  // Accessibility
  testID?: string;
}

// ============================================================================
// INPUT SIZE CONSTANTS (replaces designTokens.componentSizes.input)
// ============================================================================

const INPUT_SIZES = {
  sm: { height: 36, paddingHorizontal: 12, fontSize: theme.typography.fontSize.sm },
  md: { height: 48, paddingHorizontal: 16, fontSize: theme.typography.fontSize.base },
  lg: { height: 52, paddingHorizontal: 16, fontSize: theme.typography.fontSize.lg },
};

// ============================================================================
// INPUT COMPONENT
// ============================================================================

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      size = 'md',
      variant = 'outline',
      state = 'default',
      fullWidth = false,
      label,
      helperText,
      errorText,
      required = false,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      testID,
      ...textInputProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!textInputProps.value || !!textInputProps.defaultValue);
    const borderAnimation = useRef(new Animated.Value(0)).current;
    const labelAnimation = useRef(new Animated.Value(textInputProps.value || textInputProps.defaultValue ? 1 : 0)).current;

    // ========================================================================
    // COMPUTED STYLES
    // ========================================================================

    const containerStyles = getContainerStyles(
      variant,
      size,
      state,
      isFocused,
      fullWidth,
      !!leftIcon,
      !!rightIcon
    );
    const textStyles = getTextStyles(size, state);
    const iconColor = getIconColor(state, isFocused);

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    const handleFocus = (e: unknown) => {
      setIsFocused(true);

      // Animate border and label
      Animated.parallel([
        Animated.timing(borderAnimation, {
          toValue: 1,
          duration: theme.animation.duration.fast,
          useNativeDriver: false,
        }),
        Animated.timing(labelAnimation, {
          toValue: 1,
          duration: theme.animation.duration.fast,
          useNativeDriver: false,
        }),
      ]).start();

      textInputProps.onFocus?.(e);
    };

    const handleBlur = (e: unknown) => {
      setIsFocused(false);

      // Animate border
      Animated.timing(borderAnimation, {
        toValue: 0,
        duration: theme.animation.duration.fast,
        useNativeDriver: false,
      }).start();

      // Only animate label down if no value
      if (!hasValue) {
        Animated.timing(labelAnimation, {
          toValue: 0,
          duration: theme.animation.duration.fast,
          useNativeDriver: false,
        }).start();
      }

      textInputProps.onBlur?.(e);
    };

    const handleChangeText = (text: string) => {
      setHasValue(text.length > 0);
      textInputProps.onChangeText?.(text);
    };

    // ========================================================================
    // RENDER HELPERS
    // ========================================================================

    const renderLabel = () => {
      if (!label) return null;

      // Floating label for outline variant, static for others
      if (variant === 'outline') {
        const animatedLabelStyle = {
          position: 'absolute' as const,
          left: theme.spacing[4],
          backgroundColor: theme.colors.background,
          paddingHorizontal: theme.spacing[1],
          fontSize: labelAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [theme.typography.fontSize.base, theme.typography.fontSize.sm],
          }),
          top: labelAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [theme.spacing[3], -theme.spacing[2]],
          }),
          color: isFocused
            ? theme.colors.primary
            : theme.colors.textSecondary,
          zIndex: 1,
        };

        return (
          <Animated.Text style={animatedLabelStyle}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Animated.Text>
        );
      }

      return (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      );
    };

    const renderIcon = (
      iconName: keyof typeof Ionicons.glyphMap,
      position: 'left' | 'right',
      onPress?: () => void
    ) => {
      const IconComponent = onPress ? TouchableOpacity : View;
      const iconSize = size === 'sm' ? 16 : 20;

      return (
        <IconComponent
          onPress={onPress}
          style={[
            styles.iconContainer,
            position === 'left' && styles.leftIconContainer,
            position === 'right' && styles.rightIconContainer,
          ]}
          disabled={state === 'disabled'}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={onPress ? `${iconName} button` : undefined}
        >
          <Ionicons name={iconName} size={iconSize} color={iconColor} />
        </IconComponent>
      );
    };

    const renderHelperText = () => {
      const text = errorText || helperText;
      if (!text) return null;

      return (
        <Text
          style={[
            styles.helperText,
            errorText && styles.errorText,
          ]}
        >
          {text}
        </Text>
      );
    };

    // ========================================================================
    // RENDER COMPONENT
    // ========================================================================

    return (
      <View style={[styles.container, containerStyle]} testID={testID}>
        {renderLabel()}

        <View style={containerStyles}>
          {leftIcon && renderIcon(leftIcon, 'left')}

          <TextInput
            ref={ref}
            style={[textStyles, inputStyle]}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={handleChangeText}
            editable={state !== 'disabled'}
            placeholderTextColor={variant === 'outline' && label ? 'transparent' : theme.colors.textQuaternary}
            selectionColor={theme.colors.primary}
            {...textInputProps}
          />

          {rightIcon && renderIcon(rightIcon, 'right', onRightIconPress)}
        </View>

        {renderHelperText()}
      </View>
    );
  }
);

Input.displayName = 'Input';

// ============================================================================
// STYLE FUNCTIONS
// ============================================================================

const getContainerStyles = (
  variant: InputVariant,
  size: InputSize,
  state: InputState,
  isFocused: boolean,
  fullWidth: boolean,
  hasLeftIcon: boolean,
  hasRightIcon: boolean
): ViewStyle => {
  const baseStyle: ViewStyle = {
    ...INPUT_SIZES[size],
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.layout.minTouchTarget,
  };

  if (fullWidth) {
    baseStyle.width = '100%';
  }

  // Variant-specific styles with enhanced Material Design 3 patterns
  switch (variant) {
    case 'outline':
      return {
        ...baseStyle,
        borderWidth: isFocused ? 2 : 1,
        borderRadius: theme.borderRadius.lg,
        borderColor: getBorderColor(state, isFocused),
        backgroundColor: state === 'disabled'
          ? theme.colors.backgroundSecondary
          : theme.colors.background,
      };

    case 'filled':
      return {
        ...baseStyle,
        borderRadius: theme.borderRadius.lg,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        backgroundColor: state === 'disabled'
          ? theme.colors.backgroundTertiary
          : theme.colors.backgroundSecondary,
        borderBottomWidth: isFocused ? 2 : 1,
        borderBottomColor: getBorderColor(state, isFocused),
      };

    case 'underline':
      return {
        ...baseStyle,
        borderBottomWidth: isFocused ? 2 : 1,
        borderBottomColor: getBorderColor(state, isFocused),
        backgroundColor: 'transparent',
        paddingHorizontal: 0, // Remove horizontal padding for underline
      };

    default:
      return baseStyle;
  }
};

const getTextStyles = (size: InputSize, state: InputState) => {
  return {
    flex: 1,
    fontSize: INPUT_SIZES[size].fontSize,
    color: state === 'disabled'
      ? theme.colors.placeholder
      : theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.regular,
  };
};

const getBorderColor = (state: InputState, isFocused: boolean): string => {
  if (state === 'error') {
    return theme.colors.error;
  }
  if (state === 'success') {
    return theme.colors.success;
  }
  if (isFocused) {
    return theme.colors.borderFocus;
  }
  return theme.colors.border;
};

const getIconColor = (state: InputState, isFocused: boolean): string => {
  if (state === 'error') {
    return theme.colors.error;
  }
  if (state === 'success') {
    return theme.colors.success;
  }
  if (state === 'disabled') {
    return theme.colors.placeholder;
  }
  if (isFocused) {
    return theme.colors.primary;
  }
  return theme.colors.textTertiary;
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing[4],
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  required: {
    color: theme.colors.error,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: theme.layout.minTouchTarget,
    minHeight: theme.layout.minTouchTarget,
  },
  leftIconContainer: {
    paddingLeft: theme.spacing[3],
    paddingRight: theme.spacing[2],
  },
  rightIconContainer: {
    paddingLeft: theme.spacing[2],
    paddingRight: theme.spacing[3],
  },
  helperText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing[1],
    lineHeight: theme.typography.lineHeight.normal,
  },
  errorText: {
    color: theme.colors.errorDark,
  },
});

export default Input;

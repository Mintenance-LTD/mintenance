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
import { designTokens } from '../../../design-system/tokens';

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

    const handleFocus = (e: any) => {
      setIsFocused(true);

      // Animate border and label
      Animated.parallel([
        Animated.timing(borderAnimation, {
          toValue: 1,
          duration: designTokens.animation.duration.fast,
          useNativeDriver: false,
        }),
        Animated.timing(labelAnimation, {
          toValue: 1,
          duration: designTokens.animation.duration.fast,
          useNativeDriver: false,
        }),
      ]).start();

      textInputProps.onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);

      // Animate border
      Animated.timing(borderAnimation, {
        toValue: 0,
        duration: designTokens.animation.duration.fast,
        useNativeDriver: false,
      }).start();

      // Only animate label down if no value
      if (!hasValue) {
        Animated.timing(labelAnimation, {
          toValue: 0,
          duration: designTokens.animation.duration.fast,
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
          left: designTokens.spacing[4],
          backgroundColor: designTokens.semanticColors.background.primary,
          paddingHorizontal: designTokens.spacing[1],
          fontSize: labelAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [designTokens.typography.fontSize.base, designTokens.typography.fontSize.sm],
          }),
          top: labelAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [designTokens.spacing[3], -designTokens.spacing[2]],
          }),
          color: isFocused
            ? designTokens.semanticColors.interactive.primary
            : designTokens.semanticColors.text.secondary,
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
      const iconSize = designTokens.componentSizes.icon[size === 'sm' ? 'sm' : 'md'];

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
            placeholderTextColor={variant === 'outline' && label ? 'transparent' : designTokens.semanticColors.text.quaternary}
            selectionColor={designTokens.semanticColors.interactive.primary}
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
    ...designTokens.componentSizes.input[size],
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: designTokens.accessibility.minTouchTarget.height,
  };

  if (fullWidth) {
    baseStyle.width = '100%';
  }

  // Variant-specific styles with enhanced Material Design 3 patterns
  switch (variant) {
    case 'outline':
      return {
        ...baseStyle,
        borderWidth: isFocused ? 2 : 1, // Thicker border when focused
        borderRadius: designTokens.borderRadius.lg, // More rounded
        borderColor: getBorderColor(state, isFocused),
        backgroundColor: state === 'disabled'
          ? designTokens.colors.neutral[50]
          : designTokens.semanticColors.background.primary,
        // Add subtle elevation when focused
        ...(isFocused ? designTokens.shadows.sm : {}),
      };

    case 'filled':
      return {
        ...baseStyle,
        borderRadius: designTokens.borderRadius.lg,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        backgroundColor: state === 'disabled'
          ? designTokens.colors.neutral[100]
          : designTokens.colors.neutral[50],
        borderBottomWidth: isFocused ? 3 : 2, // Thicker underline when focused
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
    fontSize: designTokens.componentSizes.input[size].fontSize,
    color: state === 'disabled'
      ? designTokens.semanticColors.text.disabled
      : designTokens.semanticColors.text.primary,
    fontFamily: designTokens.typography.fontFamily.sans,
  };
};

const getBorderColor = (state: InputState, isFocused: boolean): string => {
  if (state === 'error') {
    return designTokens.semanticColors.border.error;
  }
  if (state === 'success') {
    return designTokens.semanticColors.border.success;
  }
  if (isFocused) {
    return designTokens.semanticColors.border.focus;
  }
  return designTokens.semanticColors.border.primary;
};

const getIconColor = (state: InputState, isFocused: boolean): string => {
  if (state === 'error') {
    return designTokens.colors.error[500];
  }
  if (state === 'success') {
    return designTokens.colors.success[500];
  }
  if (state === 'disabled') {
    return designTokens.semanticColors.text.disabled;
  }
  if (isFocused) {
    return designTokens.semanticColors.interactive.primary;
  }
  return designTokens.semanticColors.text.tertiary;
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: designTokens.spacing[4],
  },
  label: {
    fontSize: designTokens.typography.fontSize.sm,
    fontWeight: designTokens.typography.fontWeight.medium,
    color: designTokens.semanticColors.text.primary,
    marginBottom: designTokens.spacing[1],
  },
  required: {
    color: designTokens.colors.error[500],
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: designTokens.accessibility.minTouchTarget.width,
    minHeight: designTokens.accessibility.minTouchTarget.height,
  },
  leftIconContainer: {
    paddingLeft: designTokens.spacing[3],
    paddingRight: designTokens.spacing[2],
  },
  rightIconContainer: {
    paddingLeft: designTokens.spacing[2],
    paddingRight: designTokens.spacing[3],
  },
  helperText: {
    fontSize: designTokens.typography.fontSize.xs,
    color: designTokens.semanticColors.text.tertiary,
    marginTop: designTokens.spacing[1],
    lineHeight: designTokens.typography.lineHeight.normal,
  },
  errorText: {
    color: designTokens.colors.error[600],
  },
});

export default Input;
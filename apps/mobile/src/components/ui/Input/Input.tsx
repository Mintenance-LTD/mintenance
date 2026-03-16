import React, { forwardRef, useState, useRef } from 'react';
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

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'outline' | 'filled' | 'underline';
export type InputState = 'default' | 'error' | 'success' | 'disabled';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  size?: InputSize;
  variant?: InputVariant;
  state?: InputState;
  fullWidth?: boolean;
  label?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  testID?: string;
}

const INPUT_SIZES = {
  sm: { height: 36, paddingHorizontal: 12, fontSize: 13 },
  md: { height: 48, paddingHorizontal: 16, fontSize: 15 },
  lg: { height: 52, paddingHorizontal: 16, fontSize: 18 },
};

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

    const containerStyles = getContainerStyles(variant, size, state, isFocused, fullWidth, !!leftIcon, !!rightIcon);
    const textStyles = getTextStyles(size, state);
    const iconColor = getIconColor(state, isFocused);

    const handleFocus = (e: import('react-native').NativeSyntheticEvent<import('react-native').TargetedEvent>) => {
      setIsFocused(true);
      Animated.parallel([
        Animated.timing(borderAnimation, { toValue: 1, duration: 150, useNativeDriver: false }),
        Animated.timing(labelAnimation, { toValue: 1, duration: 150, useNativeDriver: false }),
      ]).start();
      textInputProps.onFocus?.(e);
    };

    const handleBlur = (e: import('react-native').NativeSyntheticEvent<import('react-native').TargetedEvent>) => {
      setIsFocused(false);
      Animated.timing(borderAnimation, { toValue: 0, duration: 150, useNativeDriver: false }).start();
      if (!hasValue) {
        Animated.timing(labelAnimation, { toValue: 0, duration: 150, useNativeDriver: false }).start();
      }
      textInputProps.onBlur?.(e);
    };

    const handleChangeText = (text: string) => {
      setHasValue(text.length > 0);
      textInputProps.onChangeText?.(text);
    };

    const renderLabel = () => {
      if (!label) return null;
      if (variant === 'outline') {
        const animatedLabelStyle = {
          position: 'absolute' as const,
          left: 16,
          backgroundColor: theme.colors.backgroundSecondary,
          paddingHorizontal: 4,
          fontSize: labelAnimation.interpolate({ inputRange: [0, 1], outputRange: [15, 13] }),
          top: labelAnimation.interpolate({ inputRange: [0, 1], outputRange: [12, -8] }),
          color: isFocused ? theme.colors.textPrimary : theme.colors.textSecondary,
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
      const iSize = size === 'sm' ? 16 : 20;
      return (
        <IconComponent
          onPress={onPress}
          style={[styles.iconContainer, position === 'left' && styles.leftIconContainer, position === 'right' && styles.rightIconContainer]}
          disabled={state === 'disabled'}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={onPress ? `${iconName} button` : undefined}
        >
          <Ionicons name={iconName} size={iSize} color={iconColor} />
        </IconComponent>
      );
    };

    const renderHelperText = () => {
      const text = errorText || helperText;
      if (!text) return null;
      return <Text style={[styles.helperText, errorText && styles.errorText]}>{text}</Text>;
    };

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
            placeholderTextColor={variant === 'outline' && label ? 'transparent' : theme.colors.textTertiary}
            selectionColor="#222222"
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
    minHeight: 44,
  };
  if (fullWidth) baseStyle.width = '100%';

  switch (variant) {
    case 'outline':
      return {
        ...baseStyle,
        borderWidth: isFocused ? 2 : 1,
        borderRadius: 12,
        borderColor: getBorderColor(state, isFocused),
        backgroundColor: state === 'disabled' ? '#F7F7F7' : theme.colors.textInverse,
      };
    case 'filled':
      return {
        ...baseStyle,
        borderRadius: 12,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        backgroundColor: state === 'disabled' ? '#EBEBEB' : theme.colors.backgroundSecondary,
        borderBottomWidth: isFocused ? 2 : 1,
        borderBottomColor: getBorderColor(state, isFocused),
      };
    case 'underline':
      return {
        ...baseStyle,
        borderBottomWidth: isFocused ? 2 : 1,
        borderBottomColor: getBorderColor(state, isFocused),
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
      };
    default:
      return baseStyle;
  }
};

const getTextStyles = (size: InputSize, state: InputState) => ({
  flex: 1,
  fontSize: INPUT_SIZES[size].fontSize,
  color: state === 'disabled' ? '#B0B0B0' : theme.colors.textPrimary,
});

const getBorderColor = (state: InputState, isFocused: boolean): string => {
  if (state === 'error') return theme.colors.error;
  if (state === 'success') return theme.colors.primary;
  if (isFocused) return theme.colors.textPrimary;
  return '#EBEBEB';
};

const getIconColor = (state: InputState, isFocused: boolean): string => {
  if (state === 'error') return theme.colors.error;
  if (state === 'success') return theme.colors.primary;
  if (state === 'disabled') return theme.colors.textTertiary;
  if (isFocused) return theme.colors.textPrimary;
  return theme.colors.textTertiary;
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  required: {
    color: theme.colors.error,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  leftIconContainer: {
    paddingLeft: 12,
    paddingRight: 8,
  },
  rightIconContainer: {
    paddingLeft: 8,
    paddingRight: 12,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
    lineHeight: 18,
  },
  errorText: {
    color: theme.colors.error,
  },
});

export default Input;

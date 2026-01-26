import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { theme } from '../../theme';

type ButtonVariant = keyof typeof theme.components.button | 'tertiary';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  accessibilityLabel?: string;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityState,
  fullWidth = false,
  size = 'md',
  icon,
  iconPosition = 'left',
  iconOnly = false,
  testID,
}) => {
  const variantStyles = variant === 'tertiary'
    ? { backgroundColor: 'transparent', color: theme.colors.info, borderColor: 'transparent' }
    : theme.components.button[variant as Exclude<ButtonVariant, 'tertiary'>];
  const backgroundColor = disabled ? theme.colors.textTertiary : (variantStyles?.backgroundColor ?? theme.colors.primary);
  const borderColor = variantStyles?.borderColor ?? 'transparent';
  const color = variantStyles?.color ?? theme.colors.textInverse;
  const isTertiary = variant === 'tertiary';

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={accessibilityState || { disabled: disabled || loading, busy: loading }}
      testID={testID}
      style={[
        styles.base,
        iconOnly ? styles.iconOnly : (size === 'sm' ? styles.sm : styles.md),
        {
          backgroundColor,
          borderColor,
          width: fullWidth ? ('100%' as const) : undefined,
        },
        !disabled && !loading && backgroundColor !== 'transparent' && theme.shadows.lg,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.textInverse} size='small' />
      ) : iconOnly ? (
        <View>{icon}</View>
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' ? (
            <View style={styles.iconLeft}>{icon}</View>
          ) : null}
          <Text
            style={[
              isTertiary ? styles.linkText : styles.text,
              {
                color,
                ...(isTertiary && { fontSize: theme.typography.fontSize.lg })
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' ? (
            <View style={styles.iconRight}>{icon}</View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  md: {
    minHeight: theme.layout.buttonHeightLarge,
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.xl,
  },
  sm: {
    // Keep min touch target per accessibility while appearing compact
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.base,
  },
  iconOnly: {
    minHeight: theme.layout.minTouchTarget,
    minWidth: theme.layout.minTouchTarget,
    paddingHorizontal: 0,
    borderRadius: theme.borderRadius.full,
  },
  text: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: theme.typography.fontWeight.medium,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  iconLeft: {
    marginRight: theme.spacing[1],
  },
  iconRight: {
    marginLeft: theme.spacing[1],
  },
});

export default Button;

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
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
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
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
  fullWidth = false,
  size = 'md',
  icon,
  iconPosition = 'left',
  iconOnly = false,
}) => {
  const v = theme.components.button[variant] as any;
  const backgroundColor = v?.backgroundColor ?? theme.colors.primary;
  const borderColor = v?.borderColor ?? 'transparent';
  const color = v?.color ?? theme.colors.textInverse;
  const isTertiary = variant === 'tertiary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        iconOnly && styles.iconOnly,
        { backgroundColor, borderColor, width: fullWidth ? '100%' as const : undefined },
        disabled ? styles.disabled : null,
        (backgroundColor === 'transparent') && styles.noShadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.textInverse} size="small" />
      ) : iconOnly ? (
        <View>{icon}</View>
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' ? <View style={styles.iconLeft}>{icon}</View> : null}
          <Text style={[styles.text, { color }, isTertiary && styles.linkText, textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' ? <View style={styles.iconRight}>{icon}</View> : null}
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
    ...theme.shadows.lg,
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
  disabled: {
    backgroundColor: theme.colors.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  noShadow: {
    shadowOpacity: 0,
    elevation: 0,
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

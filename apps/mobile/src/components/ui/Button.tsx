import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  Platform,
} from 'react-native';
import { theme } from '../../theme';
import { me } from '../../design-system/mint-editorial';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'tertiary'
  | 'ghost'
  | 'danger'
  | 'success';

export interface ButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  accessibilityLabel?: string;
  accessibilityHint?: string;
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
  leftIcon?: string;
  rightIcon?: string;
  /**
   * Opt in to the Direction A · Mint Editorial palette. Off by default
   * so the ~305 existing callers render unchanged; Mint Editorial
   * screens pass `mint`.
   */
  mint?: boolean;
}

// Mint Editorial palette overrides — see design-system/mint-editorial.ts.
const MINT_VARIANT_STYLES: Record<
  ButtonVariant,
  { backgroundColor: string; color: string; borderColor: string }
> = {
  primary: {
    backgroundColor: me.brand,
    color: me.onBrand,
    borderColor: 'transparent',
  },
  secondary: {
    backgroundColor: me.surface,
    color: me.ink,
    borderColor: me.line,
  },
  outline: {
    backgroundColor: 'transparent',
    color: me.ink,
    borderColor: me.line,
  },
  tertiary: {
    backgroundColor: 'transparent',
    color: me.brand,
    borderColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: me.ink2,
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: me.errFg,
    color: me.onBrand,
    borderColor: 'transparent',
  },
  success: {
    backgroundColor: me.brand,
    color: me.onBrand,
    borderColor: 'transparent',
  },
};

const VARIANT_STYLES: Record<
  ButtonVariant,
  { backgroundColor: string; color: string; borderColor: string }
> = {
  primary: {
    backgroundColor: theme.colors.primary,
    color: theme.colors.textInverse,
    borderColor: 'transparent',
  },
  secondary: {
    backgroundColor: theme.colors.backgroundSecondary,
    color: theme.colors.textPrimary,
    borderColor: theme.colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    color: theme.colors.textPrimary,
    borderColor: theme.colors.border,
  },
  tertiary: {
    backgroundColor: 'transparent',
    color: '#3B82F6',
    borderColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: theme.colors.error,
    color: theme.colors.textInverse,
    borderColor: 'transparent',
  },
  success: {
    backgroundColor: theme.colors.primary,
    color: theme.colors.textInverse,
    borderColor: 'transparent',
  },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  children,
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
  mint = false,
}) => {
  // 2026-05-21 audit: the type defined both `title` and `children` but
  // the render only used `title`, so the children API silently rendered
  // a label-less pill. The Subscription screen's Free-plan card hit
  // this — `<Button>Switch Plan</Button>` came out empty. Prefer
  // children when explicitly passed, fall back to title otherwise.
  const label =
    children !== undefined && children !== null && children !== ''
      ? children
      : title;
  const variantStyles = mint
    ? MINT_VARIANT_STYLES[variant]
    : VARIANT_STYLES[variant];
  const backgroundColor = disabled
    ? mint
      ? me.line
      : theme.colors.textTertiary
    : variantStyles.backgroundColor;
  const borderColor = variantStyles.borderColor;
  const color = disabled && mint ? me.ink4 : variantStyles.color;
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
      accessibilityLabel={
        accessibilityLabel || (typeof label === 'string' ? label : title)
      }
      accessibilityState={
        accessibilityState || { disabled: disabled || loading, busy: loading }
      }
      testID={testID}
      style={[
        styles.base,
        iconOnly ? styles.iconOnly : size === 'sm' ? styles.sm : styles.md,
        {
          backgroundColor,
          borderColor,
          width: fullWidth ? ('100%' as const) : undefined,
        },
        // Mint Editorial uses a calmer 10px radius (vs the legacy 28px
        // pill) on the non-icon sizes.
        mint && !iconOnly && { borderRadius: me.radius.btn },
        !disabled &&
          !loading &&
          backgroundColor !== 'transparent' &&
          styles.shadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={mint ? color : theme.colors.textInverse}
          size='small'
        />
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
              { color },
              textStyle,
            ]}
          >
            {label}
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
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 28,
  },
  sm: {
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  iconOnly: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 0,
    borderRadius: 22,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 18,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconLeft: {
    marginRight: 4,
  },
  iconRight: {
    marginLeft: 4,
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
});

export default Button;

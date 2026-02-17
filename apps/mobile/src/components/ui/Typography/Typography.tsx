import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type TypographyVariant =
  | 'display1'
  | 'display2'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'button'
  | 'caption'
  | 'overline';

export type TypographyColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'inverse'
  | 'disabled'
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

export type TypographyAlign = 'left' | 'center' | 'right' | 'justify';

export interface TypographyProps {
  // Content
  children: React.ReactNode;

  // Styling
  variant?: TypographyVariant;
  color?: TypographyColor;
  align?: TypographyAlign;

  // Text properties
  numberOfLines?: number;
  selectable?: boolean;

  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'text' | 'header';
  testID?: string;

  // Style override
  style?: TextStyle;
}

// ============================================================================
// TYPOGRAPHY COMPONENT
// ============================================================================

export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'body1',
  color = 'primary',
  align = 'left',
  numberOfLines,
  selectable = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'text',
  testID,
  style,
}) => {
  const variantStyles = getVariantStyles(variant);
  const colorStyles = getColorStyles(color);

  return (
    <Text
      style={[
        styles.base,
        variantStyles,
        colorStyles,
        { textAlign: align },
        style,
      ]}
      numberOfLines={numberOfLines}
      selectable={selectable}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </Text>
  );
};

// ============================================================================
// TYPOGRAPHY VARIANTS (Semantic Components)
// ============================================================================

export const Display1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="display1" accessibilityRole="header" />
);

export const Display2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="display2" accessibilityRole="header" />
);

export const H1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="h1" accessibilityRole="header" />
);

export const H2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="h2" accessibilityRole="header" />
);

export const H3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="h3" accessibilityRole="header" />
);

export const H4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="h4" accessibilityRole="header" />
);

export const H5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="h5" accessibilityRole="header" />
);

export const H6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="h6" accessibilityRole="header" />
);

export const Subtitle1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="subtitle1" />
);

export const Subtitle2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="subtitle2" />
);

export const Body1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="body1" />
);

export const Body2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="body2" />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="caption" />
);

export const Overline: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant="overline" />
);

// ============================================================================
// STYLE FUNCTIONS
// ============================================================================

const getVariantStyles = (variant: TypographyVariant): TextStyle => {
  switch (variant) {
    case 'display1':
      return {
        fontSize: 96,
        fontWeight: theme.typography.fontWeight.bold,
        lineHeight: theme.typography.lineHeight.tight,
      };

    case 'display2':
      return {
        fontSize: 72,
        fontWeight: theme.typography.fontWeight.bold,
        lineHeight: theme.typography.lineHeight.tight,
      };

    case 'h1':
      return {
        fontSize: 60,
        fontWeight: theme.typography.fontWeight.bold,
        lineHeight: theme.typography.lineHeight.tight,
      };

    case 'h2':
      return {
        fontSize: theme.typography.fontSize['5xl'],
        fontWeight: theme.typography.fontWeight.bold,
        lineHeight: theme.typography.lineHeight.tight,
      };

    case 'h3':
      return {
        fontSize: theme.typography.fontSize['4xl'],
        fontWeight: theme.typography.fontWeight.semibold,
        lineHeight: 1.375,
      };

    case 'h4':
      return {
        fontSize: theme.typography.fontSize['3xl'],
        fontWeight: theme.typography.fontWeight.semibold,
        lineHeight: 1.375,
      };

    case 'h5':
      return {
        fontSize: theme.typography.fontSize['2xl'],
        fontWeight: theme.typography.fontWeight.semibold,
        lineHeight: 1.375,
      };

    case 'h6':
      return {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.semibold,
        lineHeight: theme.typography.lineHeight.normal,
      };

    case 'subtitle1':
      return {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.medium,
        lineHeight: theme.typography.lineHeight.normal,
      };

    case 'subtitle2':
      return {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.medium,
        lineHeight: theme.typography.lineHeight.normal,
      };

    case 'body1':
      return {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.regular,
        lineHeight: theme.typography.lineHeight.relaxed,
      };

    case 'body2':
      return {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.regular,
        lineHeight: theme.typography.lineHeight.normal,
      };

    case 'button':
      return {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.semibold,
        lineHeight: 1,
        textTransform: 'uppercase',
        letterSpacing: 0.025,
      };

    case 'caption':
      return {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.regular,
        lineHeight: theme.typography.lineHeight.normal,
      };

    case 'overline':
      return {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.semibold,
        lineHeight: theme.typography.lineHeight.normal,
        textTransform: 'uppercase',
        letterSpacing: 0.1,
      };

    default:
      return {};
  }
};

const getColorStyles = (color: TypographyColor): TextStyle => {
  switch (color) {
    case 'primary':
      return { color: theme.colors.textPrimary };
    case 'secondary':
      return { color: theme.colors.textSecondary };
    case 'tertiary':
      return { color: theme.colors.textTertiary };
    case 'quaternary':
      return { color: theme.colors.textQuaternary };
    case 'inverse':
      return { color: theme.colors.white };
    case 'disabled':
      return { color: theme.colors.placeholder };
    case 'success':
      return { color: theme.colors.successDark };
    case 'error':
      return { color: theme.colors.errorDark };
    case 'warning':
      return { color: theme.colors.warningDark };
    case 'info':
      return { color: theme.colors.infoDark };
    default:
      return {};
  }
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  base: {
    fontFamily: theme.typography.fontFamily.regular,
  },
});

export default Typography;
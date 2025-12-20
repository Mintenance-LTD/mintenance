import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { designTokens } from '../../../design-system/tokens';

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
        fontSize: designTokens.typography.fontSize['8xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
        lineHeight: designTokens.typography.lineHeight.tight,
      };

    case 'display2':
      return {
        fontSize: designTokens.typography.fontSize['7xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
        lineHeight: designTokens.typography.lineHeight.tight,
      };

    case 'h1':
      return {
        fontSize: designTokens.typography.fontSize['6xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
        lineHeight: designTokens.typography.lineHeight.tight,
      };

    case 'h2':
      return {
        fontSize: designTokens.typography.fontSize['5xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
        lineHeight: designTokens.typography.lineHeight.tight,
      };

    case 'h3':
      return {
        fontSize: designTokens.typography.fontSize['4xl'],
        fontWeight: designTokens.typography.fontWeight.semibold,
        lineHeight: designTokens.typography.lineHeight.snug,
      };

    case 'h4':
      return {
        fontSize: designTokens.typography.fontSize['3xl'],
        fontWeight: designTokens.typography.fontWeight.semibold,
        lineHeight: designTokens.typography.lineHeight.snug,
      };

    case 'h5':
      return {
        fontSize: designTokens.typography.fontSize['2xl'],
        fontWeight: designTokens.typography.fontWeight.semibold,
        lineHeight: designTokens.typography.lineHeight.snug,
      };

    case 'h6':
      return {
        fontSize: designTokens.typography.fontSize.xl,
        fontWeight: designTokens.typography.fontWeight.semibold,
        lineHeight: designTokens.typography.lineHeight.normal,
      };

    case 'subtitle1':
      return {
        fontSize: designTokens.typography.fontSize.lg,
        fontWeight: designTokens.typography.fontWeight.medium,
        lineHeight: designTokens.typography.lineHeight.normal,
      };

    case 'subtitle2':
      return {
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.medium,
        lineHeight: designTokens.typography.lineHeight.normal,
      };

    case 'body1':
      return {
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.normal,
        lineHeight: designTokens.typography.lineHeight.relaxed,
      };

    case 'body2':
      return {
        fontSize: designTokens.typography.fontSize.sm,
        fontWeight: designTokens.typography.fontWeight.normal,
        lineHeight: designTokens.typography.lineHeight.normal,
      };

    case 'button':
      return {
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.semibold,
        lineHeight: designTokens.typography.lineHeight.none,
        textTransform: 'uppercase',
        letterSpacing: designTokens.typography.letterSpacing.wide,
      };

    case 'caption':
      return {
        fontSize: designTokens.typography.fontSize.xs,
        fontWeight: designTokens.typography.fontWeight.normal,
        lineHeight: designTokens.typography.lineHeight.normal,
      };

    case 'overline':
      return {
        fontSize: designTokens.typography.fontSize.xs,
        fontWeight: designTokens.typography.fontWeight.semibold,
        lineHeight: designTokens.typography.lineHeight.normal,
        textTransform: 'uppercase',
        letterSpacing: designTokens.typography.letterSpacing.widest,
      };

    default:
      return {};
  }
};

const getColorStyles = (color: TypographyColor): TextStyle => {
  switch (color) {
    case 'primary':
      return { color: designTokens.semanticColors.text.primary };
    case 'secondary':
      return { color: designTokens.semanticColors.text.secondary };
    case 'tertiary':
      return { color: designTokens.semanticColors.text.tertiary };
    case 'quaternary':
      return { color: designTokens.semanticColors.text.quaternary };
    case 'inverse':
      return { color: designTokens.semanticColors.text.inverse };
    case 'disabled':
      return { color: designTokens.semanticColors.text.disabled };
    case 'success':
      return { color: designTokens.semanticColors.text.success };
    case 'error':
      return { color: designTokens.semanticColors.text.error };
    case 'warning':
      return { color: designTokens.semanticColors.text.warning };
    case 'info':
      return { color: designTokens.semanticColors.text.info };
    default:
      return {};
  }
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  base: {
    fontFamily: designTokens.typography.fontFamily.sans,
  },
});

export default Typography;
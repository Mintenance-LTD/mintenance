import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

type TypographyVariant =
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

type TypographyColor =
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

type TypographyAlign = 'left' | 'center' | 'right' | 'justify';

interface TypographyProps {
  children: React.ReactNode;
  variant?: TypographyVariant;
  color?: TypographyColor;
  align?: TypographyAlign;
  numberOfLines?: number;
  selectable?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'text' | 'header';
  testID?: string;
  style?: TextStyle;
}

const COLOR_MAP: Record<TypographyColor, string> = {
  primary: theme.colors.textPrimary,
  secondary: theme.colors.textSecondary,
  tertiary: theme.colors.textTertiary,
  quaternary: theme.colors.border,
  inverse: theme.colors.textInverse,
  disabled: theme.colors.textTertiary,
  success: '#065F46',
  error: '#991B1B',
  warning: '#92400E',
  info: '#1E40AF',
};

const VARIANT_STYLES: Record<TypographyVariant, TextStyle> = {
  display1: { fontSize: 48, fontWeight: '700', lineHeight: 53 },
  display2: { fontSize: 36, fontWeight: '700', lineHeight: 40 },
  h1: { fontSize: 30, fontWeight: '700', lineHeight: 35 },
  h2: { fontSize: 24, fontWeight: '700', lineHeight: 29 },
  h3: { fontSize: 20, fontWeight: '700', lineHeight: 25 },
  h4: { fontSize: 18, fontWeight: '600', lineHeight: 23 },
  h5: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  h6: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  subtitle1: { fontSize: 18, fontWeight: '500', lineHeight: 24 },
  subtitle2: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  body1: { fontSize: 15, fontWeight: '400', lineHeight: 24 },
  body2: { fontSize: 13, fontWeight: '400', lineHeight: 20 },
  button: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 15,
    letterSpacing: 0.025,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  overline: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.05,
  },
};

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
}) => (
  <Text
    style={[
      VARIANT_STYLES[variant],
      { color: COLOR_MAP[color], textAlign: align },
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

const Display1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='display1' accessibilityRole='header' />
);
const Display2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='display2' accessibilityRole='header' />
);
export const H1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='h1' accessibilityRole='header' />
);
export const H2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='h2' accessibilityRole='header' />
);
export const H3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='h3' accessibilityRole='header' />
);
const H4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='h4' accessibilityRole='header' />
);
const H5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='h5' accessibilityRole='header' />
);
const H6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='h6' accessibilityRole='header' />
);
const Subtitle1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='subtitle1' />
);
const Subtitle2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='subtitle2' />
);
export const Body1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='body1' />
);
export const Body2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='body2' />
);
export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='caption' />
);
const Overline: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography {...props} variant='overline' />
);

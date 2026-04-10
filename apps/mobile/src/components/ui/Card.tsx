import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { theme } from '../../theme';

type CardVariant = 'default' | 'elevated' | 'outlined';

interface CardProps {
  children?: React.ReactNode;
  variant?: CardVariant;
  padding?: string;
  style?: ViewStyle | ViewStyle[];
}

const VARIANT_STYLES: Record<CardVariant, ViewStyle> = {
  default: {
    backgroundColor: theme.colors.surface,
  },
  elevated: {
    backgroundColor: theme.colors.surface,
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
  outlined: {
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  const v = VARIANT_STYLES[variant];
  return <View style={[styles.base, v, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    padding: 16,
    borderRadius: 16,
  },
});

export default Card;

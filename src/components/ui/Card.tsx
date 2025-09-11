import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';

type CardVariant = keyof typeof theme.components.card;

export interface CardProps {
  children?: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle | ViewStyle[];
}

export const Card: React.FC<CardProps> = ({ children, variant = 'default', style }) => {
  const v = theme.components.card[variant] as any;
  return <View style={[styles.base, v, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.xl,
  },
});

export default Card;


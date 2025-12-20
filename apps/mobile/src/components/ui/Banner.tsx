import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

type BannerVariant = 'error' | 'success' | 'info';

export interface BannerProps {
  message: string;
  variant?: BannerVariant;
  testID?: string;
}

const variantConfig: Record<BannerVariant, { icon: string; background: string; text: string }> = {
  error: {
    icon: 'alert-circle',
    background: theme.colors.errorLight,
    text: theme.colors.errorDark,
  },
  success: {
    icon: 'checkmark-circle',
    background: theme.colors.successLight,
    text: theme.colors.successDark,
  },
  info: {
    icon: 'information-circle',
    background: theme.colors.infoLight,
    text: theme.colors.infoDark,
  },
};

export const Banner: React.FC<BannerProps> = ({ message, variant = 'info', testID }) => {
  if (!message) {
    return null;
  }

  const config = variantConfig[variant];

  return (
    <View style={[styles.container, { backgroundColor: config.background }]} testID={testID}>
      <Ionicons
        name={config.icon as any}
        size={18}
        color={config.text}
        accessibilityElementsHidden
      />
      <Text style={[styles.message, { color: config.text }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  message: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
});

export default Banner;

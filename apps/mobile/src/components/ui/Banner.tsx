import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

type BannerVariant = 'error' | 'success' | 'info';

interface BannerProps {
  message: string;
  variant?: BannerVariant;
  testID?: string;
}

const variantConfig: Record<
  BannerVariant,
  { icon: string; background: string; text: string }
> = {
  error: { icon: 'alert-circle', background: '#FEE2E2', text: '#991B1B' },
  success: {
    icon: 'checkmark-circle',
    background: theme.colors.primaryLight,
    text: '#065F46',
  },
  info: { icon: 'information-circle', background: '#DBEAFE', text: '#1E40AF' },
};

export const Banner: React.FC<BannerProps> = ({
  message,
  variant = 'info',
  testID,
}) => {
  if (!message) return null;
  const config = variantConfig[variant];

  return (
    <View
      style={[styles.container, { backgroundColor: config.background }]}
      testID={testID}
    >
      <Ionicons
        name={config.icon as keyof typeof Ionicons.glyphMap}
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 12,
    gap: 8,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default Banner;

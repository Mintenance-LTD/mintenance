import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { me } from '../../design-system/mint-editorial';

type BannerVariant = 'error' | 'success' | 'info';

interface BannerProps {
  message: string;
  variant?: BannerVariant;
  testID?: string;
  /**
   * Opt in to the Direction A · Mint Editorial palette. Off by default
   * so existing callers render unchanged.
   */
  mint?: boolean;
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

// Mint Editorial status palette — see design-system/mint-editorial.ts.
const MINT_VARIANT_CONFIG: Record<
  BannerVariant,
  { icon: string; background: string; text: string }
> = {
  error: { icon: 'alert-circle', background: me.errBg, text: me.errFg },
  success: { icon: 'checkmark-circle', background: me.okBg, text: me.okFg },
  info: { icon: 'information-circle', background: me.infoBg, text: me.infoFg },
};

export const Banner: React.FC<BannerProps> = ({
  message,
  variant = 'info',
  testID,
  mint = false,
}) => {
  if (!message) return null;
  const config = mint ? MINT_VARIANT_CONFIG[variant] : variantConfig[variant];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.background },
        mint && { borderRadius: me.radius.input },
      ]}
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

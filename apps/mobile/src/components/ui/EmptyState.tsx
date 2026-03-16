/**
 * EmptyState - Reusable empty state component for lists and screens
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  ctaLabel,
  onCtaPress,
  style,
}) => (
  <View style={[styles.container, style]}>
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={48} color={theme.colors.textTertiary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    {ctaLabel && onCtaPress && (
      <TouchableOpacity style={styles.ctaButton} onPress={onCtaPress}>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 28,
  },
  ctaText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default EmptyState;

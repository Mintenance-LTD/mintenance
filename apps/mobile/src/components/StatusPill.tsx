import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

type Status = 'upcoming' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<Status, { bg: string; fg: string; label: string }> = {
  upcoming: { bg: theme.colors.primaryLight, fg: theme.colors.primaryDark, label: 'Upcoming' },
  completed: { bg: theme.colors.backgroundTertiary, fg: theme.colors.textPrimary, label: 'Completed' },
  cancelled: { bg: theme.colors.errorLight ?? '#FEF2F2', fg: theme.colors.error, label: 'Cancelled' },
};

export const StatusPill: React.FC<{ status: Status; style?: ViewStyle }> = ({ status, style }) => {
  const cfg = STATUS_CONFIG[status];

  return (
    <View accessibilityLabel={`${cfg.label} status`} style={[styles.pill, { backgroundColor: cfg.bg }, style]}>
      <Text style={[styles.text, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

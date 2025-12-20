import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

type Status = 'upcoming' | 'completed' | 'cancelled';

export const StatusPill: React.FC<{ status: Status; style?: ViewStyle }> = ({ status, style }) => {
  const cfg = {
    upcoming: { bg: theme.colors.status?.upcoming ?? '#E6F2FF', fg: theme.colors.primary[600] ?? theme.colors.primary, label: 'Upcoming' },
    completed: { bg: theme.colors.status?.completed ?? '#EAF7EE', fg: theme.colors.success[700] ?? '#2E7D32', label: 'Completed' },
    cancelled: { bg: theme.colors.status?.cancelled ?? '#FDECEA', fg: theme.colors.error[700] ?? theme.colors.error, label: 'Cancelled' },
  }[status];

  return (
    <View accessibilityLabel={`${cfg.label} status`} style={[styles.pill, { backgroundColor: cfg.bg }, style]}> 
      <Text style={[styles.text, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

type Status = 'upcoming' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<Status, { bg: string; fg: string; label: string }> = {
  upcoming: { bg: '#D1FAE5', fg: '#065F46', label: 'Upcoming' },
  completed: { bg: '#F7F7F7', fg: '#222222', label: 'Completed' },
  cancelled: { bg: '#FEE2E2', fg: '#EF4444', label: 'Cancelled' },
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

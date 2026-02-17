import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

type Status = 'upcoming' | 'completed' | 'cancelled';

export const StatusPill: React.FC<{ status: Status; style?: ViewStyle }> = ({ status, style }) => {
  const cfg = {
    upcoming: { bg: '#D1FAE5', fg: '#059669', label: 'Upcoming' },
    completed: { bg: '#F0F0F0', fg: '#222222', label: 'Completed' },
    cancelled: { bg: '#FDECEA', fg: '#B91C1C', label: 'Cancelled' },
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

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  change?: { value: number; isPositive: boolean };
  onPress?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  color,
  change,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.kpiCard, { borderLeftColor: color }]}
      onPress={onPress}
    >
      <View style={styles.kpiHeader}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      {change && (
        <View style={styles.changeContainer}>
          <Ionicons
            name={change.isPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={
              change.isPositive ? theme.colors.success : theme.colors.error
            }
          />
          <Text
            style={[
              styles.changeText,
              {
                color: change.isPositive
                  ? theme.colors.success
                  : theme.colors.error,
              },
            ]}
          >
            {change.isPositive ? '+' : ''}
            {change.value.toFixed(1)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  kpiCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderLeftWidth: 4,
    ...theme.shadows.base,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});

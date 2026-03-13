import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      style={styles.kpiCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.kpiIconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={color} />
      </View>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {change && (
        <View style={styles.changeContainer}>
          <Ionicons
            name={change.isPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={change.isPositive ? '#10B981' : '#EF4444'}
          />
          <Text
            style={[
              styles.changeText,
              {
                color: change.isPositive ? '#10B981' : '#EF4444',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  kpiIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiTitle: {
    fontSize: 13,
    color: '#717171',
    fontWeight: '500',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 4,
    letterSpacing: -0.3,
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

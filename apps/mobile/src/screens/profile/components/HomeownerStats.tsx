import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HomeownerStatsProps {
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
}

interface StatCard {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  value: number;
  label: string;
}

export const HomeownerStats: React.FC<HomeownerStatsProps> = ({
  totalJobs,
  completedJobs,
  activeJobs,
}) => {
  const stats: StatCard[] = [
    {
      icon: 'list',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      value: totalJobs,
      label: 'Posted',
    },
    {
      icon: 'checkmark-circle',
      iconColor: '#10B981',
      iconBg: '#D1FAE5',
      value: completedJobs,
      label: 'Completed',
    },
    {
      icon: 'time',
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      value: activeJobs,
      label: 'Active',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Your Activity
      </Text>
      <View style={styles.row}>
        {stats.map((s) => (
          <View key={s.label} style={styles.card} accessibilityLabel={`${s.value} ${s.label}`}>
            <View style={[styles.iconChip, { backgroundColor: s.iconBg }]}>
              <Ionicons name={s.icon} size={18} color={s.iconColor} />
            </View>
            <Text style={styles.value}>{s.value}</Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#717171',
  },
});

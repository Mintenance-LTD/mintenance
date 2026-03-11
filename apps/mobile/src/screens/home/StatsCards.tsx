/**
 * StatsCards Component
 *
 * Airbnb-style horizontal scrollable stat cards.
 * Each card: colored left accent bar, bold metric, label.
 * Clean, borderless, with soft shadow.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../../components/skeletons/Skeleton';

interface StatsCardsProps {
  isLoading?: boolean;
  activeJobs?: number;
  completedJobs?: number;
  totalSpent?: number;
  savedPros?: number;
}

interface StatConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  getValue: (props: StatsCardsProps) => string;
}

const STATS: StatConfig[] = [
  {
    label: 'Active',
    icon: 'briefcase',
    accentColor: '#10B981',
    getValue: (p) => `${p.activeJobs ?? 0}`,
  },
  {
    label: 'Completed',
    icon: 'checkmark-circle',
    accentColor: '#3B82F6',
    getValue: (p) => `${p.completedJobs ?? 0}`,
  },
  {
    label: 'Spent',
    icon: 'card',
    accentColor: '#F59E0B',
    getValue: (p) => {
      const v = p.totalSpent ?? 0;
      return v > 0 ? `\u00A3${v.toLocaleString()}` : '\u00A30';
    },
  },
  {
    label: 'Saved Pros',
    icon: 'star',
    accentColor: '#EF4444',
    getValue: (p) => `${p.savedPros ?? 0}`,
  },
];

export const StatsCards: React.FC<StatsCardsProps> = (props) => {
  if (props.isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.card}>
              <Skeleton width={40} height={40} borderRadius={12} />
              <Skeleton width={40} height={28} borderRadius={6} style={{ marginTop: 12 }} />
              <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {STATS.map((stat) => (
          <View
            key={stat.label}
            style={styles.card}
            accessibilityLabel={`${stat.label}: ${stat.getValue(props)}`}
          >
            <View style={[styles.accentBar, { backgroundColor: stat.accentColor }]} />

            <View style={[styles.iconCircle, { backgroundColor: stat.accentColor + '15' }]}>
              <Ionicons name={stat.icon} size={20} color={stat.accentColor} />
            </View>

            <Text style={styles.value}>{stat.getValue(props)}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  scrollContent: {
    paddingRight: 20,
    gap: 12,
  },
  card: {
    width: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    paddingLeft: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: '#717171',
    fontWeight: '500',
  },
});

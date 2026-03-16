import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ServiceArea } from '../../services/ServiceAreasService';
import { theme } from '../../theme';

interface ServiceAreasStatsProps {
  serviceAreas: ServiceArea[];
}

export const ServiceAreasStats: React.FC<ServiceAreasStatsProps> = ({ serviceAreas }) => {
  const activeAreas = serviceAreas.filter((area) => area.is_active);
  const inactiveAreas = serviceAreas.filter((area) => !area.is_active);
  const primaryArea = serviceAreas.find((area) => area.is_primary_area);

  const renderStatsCard = (
    title: string,
    value: string | number,
    icon: string
  ) => (
    <View style={styles.statCard}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={theme.colors.textSecondary} />
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.statsContainer}>
      {renderStatsCard('Total Areas', serviceAreas.length, 'map')}
      {renderStatsCard('Active', activeAreas.length, 'checkmark-circle')}
      {renderStatsCard('Inactive', inactiveAreas.length, 'pause-circle')}
      {renderStatsCard('Primary', primaryArea ? '1' : '0', 'star')}
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
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
  statContent: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

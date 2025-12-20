import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import type { ServiceArea } from '../../services/ServiceAreasService';

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
    icon: string,
    color: string
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.statsContainer}>
      {renderStatsCard(
        'Total Areas',
        serviceAreas.length,
        'map',
        theme.colors.primary
      )}
      {renderStatsCard(
        'Active',
        activeAreas.length,
        'checkmark-circle',
        theme.colors.success
      )}
      {renderStatsCard(
        'Inactive',
        inactiveAreas.length,
        'pause-circle',
        theme.colors.textSecondary
      )}
      {renderStatsCard(
        'Primary',
        primaryArea ? '1' : '0',
        'star',
        theme.colors.warning
      )}
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
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderLeftWidth: 4,
    ...theme.shadows.base,
  },
  statContent: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

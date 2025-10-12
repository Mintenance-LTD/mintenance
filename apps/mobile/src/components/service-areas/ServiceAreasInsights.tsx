import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import type { ServiceArea } from '../../services/ServiceAreasService';

interface ServiceAreasInsightsProps {
  serviceAreas: ServiceArea[];
}

export const ServiceAreasInsights: React.FC<ServiceAreasInsightsProps> = ({ serviceAreas }) => {
  if (serviceAreas.length === 0) return null;

  const primaryArea = serviceAreas.find((area) => area.is_primary_area);
  const averageResponseTime = Math.round(
    serviceAreas.reduce((sum, area) => sum + area.response_time_hours, 0) / serviceAreas.length
  );
  const totalTravelCharges = serviceAreas
    .reduce((sum, area) => sum + area.base_travel_charge, 0)
    .toFixed(2);

  return (
    <View style={styles.insightsContainer}>
      <Text style={styles.insightsTitle}>Coverage Overview</Text>

      {primaryArea && (
        <View style={styles.insightItem}>
          <Ionicons name='star' size={16} color={theme.colors.warning} />
          <Text style={styles.insightText}>
            Primary area: {primaryArea.area_name}
          </Text>
        </View>
      )}

      <View style={styles.insightItem}>
        <Ionicons
          name='speedometer'
          size={16}
          color={theme.colors.primary}
        />
        <Text style={styles.insightText}>
          Average response time: {averageResponseTime}h
        </Text>
      </View>

      <View style={styles.insightItem}>
        <Ionicons name='cash' size={16} color={theme.colors.success} />
        <Text style={styles.insightText}>
          Base travel charges: £{totalTravelCharges} total
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  insightsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
});

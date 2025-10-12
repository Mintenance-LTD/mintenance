import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { ServiceAreaCard } from '../ServiceAreaCard';
import Button from '../ui/Button';
import { theme } from '../../theme';
import type { ServiceArea } from '../../services/ServiceAreasService';

interface ServiceAreasListProps {
  serviceAreas: ServiceArea[];
  navigation: StackNavigationProp<any>;
  onToggleActive: (area: ServiceArea) => void;
  onDelete: (area: ServiceArea) => void;
}

export const ServiceAreasList: React.FC<ServiceAreasListProps> = ({
  serviceAreas,
  navigation,
  onToggleActive,
  onDelete,
}) => {
  const activeAreas = serviceAreas.filter((area) => area.is_active);
  const inactiveAreas = serviceAreas.filter((area) => !area.is_active);

  if (serviceAreas.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name='map-outline'
          size={64}
          color={theme.colors.textTertiary}
        />
        <Text style={styles.emptyTitle}>No service areas defined</Text>
        <Text style={styles.emptyText}>
          Create your first service area to start accepting jobs in your
          preferred locations
        </Text>
        <Button
          variant='primary'
          title='Create Service Area'
          onPress={() => navigation.navigate('CreateServiceArea')}
        />
      </View>
    );
  }

  return (
    <View style={styles.areasContainer}>
      <Text style={styles.sectionTitle}>Your Service Areas</Text>

      {/* Active Areas */}
      {activeAreas.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>
            Active Areas ({activeAreas.length})
          </Text>
          {activeAreas.map((area) => (
            <ServiceAreaCard
              key={area.id}
              serviceArea={area}
              onPress={() =>
                navigation.navigate('ServiceAreaDetail', {
                  areaId: area.id,
                })
              }
              onEdit={() =>
                navigation.navigate('EditServiceArea', {
                  areaId: area.id,
                })
              }
              onToggleActive={() => onToggleActive(area)}
              onDelete={() => onDelete(area)}
            />
          ))}
        </>
      )}

      {/* Inactive Areas */}
      {inactiveAreas.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>
            Inactive Areas ({inactiveAreas.length})
          </Text>
          {inactiveAreas.map((area) => (
            <ServiceAreaCard
              key={area.id}
              serviceArea={area}
              onPress={() =>
                navigation.navigate('ServiceAreaDetail', {
                  areaId: area.id,
                })
              }
              onEdit={() =>
                navigation.navigate('EditServiceArea', {
                  areaId: area.id,
                })
              }
              onToggleActive={() => onToggleActive(area)}
              onDelete={() => onDelete(area)}
            />
          ))}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  areasContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});

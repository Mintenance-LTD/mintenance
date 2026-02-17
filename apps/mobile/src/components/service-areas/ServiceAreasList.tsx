import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { ServiceAreaCard } from '../ServiceAreaCard';
import Button from '../ui/Button';
import { theme } from '../../theme';
import type { ServiceArea } from '../../services/ServiceAreasService';

interface ServiceAreasListProps {
  serviceAreas: ServiceArea[];
  navigation: StackNavigationProp<Record<string, undefined>>;
  onToggleActive: (area: ServiceArea) => void;
  onDelete: (area: ServiceArea) => void;
}

type ListItem =
  | { type: 'header'; title: string }
  | { type: 'area'; area: ServiceArea };

export const ServiceAreasList: React.FC<ServiceAreasListProps> = ({
  serviceAreas,
  navigation,
  onToggleActive,
  onDelete,
}) => {
  const listData = useMemo(() => {
    const activeAreas = serviceAreas.filter((area) => area.is_active);
    const inactiveAreas = serviceAreas.filter((area) => !area.is_active);
    const items: ListItem[] = [];

    if (activeAreas.length > 0) {
      items.push({ type: 'header', title: `Active Areas (${activeAreas.length})` });
      activeAreas.forEach((area) => items.push({ type: 'area', area }));
    }

    if (inactiveAreas.length > 0) {
      items.push({ type: 'header', title: `Inactive Areas (${inactiveAreas.length})` });
      inactiveAreas.forEach((area) => items.push({ type: 'area', area }));
    }

    return items;
  }, [serviceAreas]);

  return (
    <FlatList
      data={listData}
      keyExtractor={(item, index) =>
        item.type === 'area' ? item.area.id : `header-${index}`
      }
      renderItem={({ item }) => {
        if (item.type === 'header') {
          return <Text style={styles.subsectionTitle}>{item.title}</Text>;
        }
        const area = item.area;
        return (
          <ServiceAreaCard
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
        );
      }}
      scrollEnabled={false}
      ListHeaderComponent={
        <Text style={styles.sectionTitle}>Your Service Areas</Text>
      }
      ListEmptyComponent={
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
      }
      contentContainerStyle={styles.areasContainer}
    />
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

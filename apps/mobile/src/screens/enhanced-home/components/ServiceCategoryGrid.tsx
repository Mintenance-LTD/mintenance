/**
 * ServiceCategoryGrid Component
 * 
 * Grid of service category icons.
 * 
 * @filesize Target: <90 lines
 * @compliance Single Responsibility - Service categories display
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { Service } from '../viewmodels/EnhancedHomeViewModel';

interface ServiceCategoryGridProps {
  services: Service[];
  onServicePress: (serviceId: string) => void;
}

export const ServiceCategoryGrid: React.FC<ServiceCategoryGridProps> = ({
  services,
  onServicePress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Service Categories</Text>
      <View style={styles.grid}>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceItem}
            onPress={() => onServicePress(service.id)}
          >
            <View style={styles.serviceIcon}>
              <Ionicons
                name={service.icon}
                size={28}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.serviceName}>{service.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: '18%',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  serviceIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  serviceName: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});

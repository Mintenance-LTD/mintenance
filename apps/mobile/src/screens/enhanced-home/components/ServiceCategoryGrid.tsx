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
      <Text style={styles.sectionTitle} accessibilityRole='header'>Service Categories</Text>
      <View style={styles.grid}>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceItem}
            onPress={() => onServicePress(service.id)}
            accessibilityRole='button'
            accessibilityLabel={`${service.name} service category`}
            accessibilityHint='Double tap to browse this service category'
          >
            <View style={styles.serviceIcon}>
              <Ionicons
                name={service.icon as keyof typeof Ionicons.glyphMap}
                size={28}
                color="#717171"
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
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceItem: {
    width: '20%',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 12,
    color: '#222222',
    textAlign: 'center',
  },
});

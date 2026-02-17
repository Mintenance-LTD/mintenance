/**
 * QuickServices Component
 * 
 * Displays quick service shortcuts for homeowners to find contractors
 * for common services like plumbing, electrical, etc.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ResponsiveGrid } from '../../components/responsive';
import { useHaptics } from '../../utils/haptics';

export interface QuickServicesProps {
  onServicePress: (params: Record<string, unknown>) => void;
  onBrowseAllPress: () => void;
}

export const QuickServices: React.FC<QuickServicesProps> = ({
  onServicePress,
  onBrowseAllPress,
}) => {
  const haptics = useHaptics();

  const services = [
    {
      id: 'plumbing',
      name: 'Plumbing',
      subtitle: 'Leaks, pipes, drains',
      icon: 'water',
      iconColor: theme.colors.infoDark,
      backgroundColor: theme.colors.infoLight,
      params: {
        serviceCategory: 'plumbing',
        filter: { skills: ['Plumbing', 'Pipe Repair', 'Leak Repair'] },
      },
    },
    {
      id: 'electrical',
      name: 'Electrical',
      subtitle: 'Wiring, outlets, lights',
      icon: 'flash',
      iconColor: theme.colors.warningDark,
      backgroundColor: theme.colors.warningLight,
      params: {
        serviceCategory: 'electrical',
        filter: { skills: ['Electrical', 'Wiring', 'Electrical Repair'] },
      },
    },
    {
      id: 'appliance',
      name: 'Appliances',
      subtitle: 'Washer, fridge, oven',
      icon: 'home',
      iconColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceTertiary,
      params: {
        serviceCategory: 'appliance',
        filter: { skills: ['Appliance Repair', 'Washing Machine', 'Refrigerator'] },
      },
    },
    {
      id: 'hvac',
      name: 'HVAC',
      subtitle: 'AC, heating, vents',
      icon: 'snow',
      iconColor: theme.colors.successDark,
      backgroundColor: theme.colors.successLight,
      params: {
        serviceCategory: 'hvac',
        filter: { skills: ['HVAC', 'Air Conditioning', 'Heating'] },
      },
    },
  ];

  return (
    <View style={styles.quickServicesSection}>
      <Text style={styles.sectionTitle}>Need Help With?</Text>
      <Text style={styles.sectionSubtitle}>Quick access to common services</Text>

      <ResponsiveGrid
        columns={2}
        gap={16}
        responsive={{
          mobile: 2,
          tablet: 3,
          desktop: 4,
        }}
        style={styles.quickServicesGrid}
      >
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.quickServiceCard}
            onPress={() => {
              haptics.buttonPress();
              onServicePress(service.params);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Find ${service.name.toLowerCase()} contractors`}
          >
            <View style={[
              styles.quickServiceIcon,
              { backgroundColor: service.backgroundColor },
            ]}>
              <Ionicons name={service.icon as unknown} size={24} color={service.iconColor} />
            </View>
            <Text style={styles.quickServiceText} numberOfLines={1} adjustsFontSizeToFit>{service.name}</Text>
            <Text style={styles.quickServiceSubtext} numberOfLines={1}>{service.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ResponsiveGrid>

      {/* Browse All Services Button */}
      <TouchableOpacity
        style={styles.browseAllButton}
        onPress={() => {
          haptics.buttonPress();
          onBrowseAllPress();
        }}
        accessibilityRole="button"
        accessibilityLabel="Browse all services"
      >
        <Ionicons name="grid-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.browseAllText}>Browse All Services</Text>
        <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  quickServicesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  quickServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickServiceCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  quickServiceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickServiceText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickServiceSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  browseAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  browseAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

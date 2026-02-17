/**
 * QuickServices Component
 *
 * Airbnb-style horizontal scrollable category tabs with icons.
 * Matches the "Rooms / Amazing views / Beachfront" pattern from Airbnb.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useHaptics } from '../../utils/haptics';

export interface QuickServicesProps {
  onServicePress: (params: Record<string, unknown>) => void;
  onBrowseAllPress: () => void;
}

const SERVICES = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: 'water-outline' as keyof typeof Ionicons.glyphMap,
    params: { serviceCategory: 'plumbing', filter: { skills: ['Plumbing', 'Pipe Repair', 'Leak Repair'] } },
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'flash-outline' as keyof typeof Ionicons.glyphMap,
    params: { serviceCategory: 'electrical', filter: { skills: ['Electrical', 'Wiring', 'Electrical Repair'] } },
  },
  {
    id: 'appliance',
    name: 'Appliances',
    icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
    params: { serviceCategory: 'appliance', filter: { skills: ['Appliance Repair', 'Washing Machine', 'Refrigerator'] } },
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: 'snow-outline' as keyof typeof Ionicons.glyphMap,
    params: { serviceCategory: 'hvac', filter: { skills: ['HVAC', 'Air Conditioning', 'Heating'] } },
  },
  {
    id: 'roofing',
    name: 'Roofing',
    icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
    params: { serviceCategory: 'roofing', filter: { skills: ['Roofing', 'Roof Repair'] } },
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: 'color-palette-outline' as keyof typeof Ionicons.glyphMap,
    params: { serviceCategory: 'painting', filter: { skills: ['Painting', 'Decorating'] } },
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    icon: 'hammer-outline' as keyof typeof Ionicons.glyphMap,
    params: { serviceCategory: 'carpentry', filter: { skills: ['Carpentry', 'Woodwork'] } },
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: 'sparkles-outline' as keyof typeof Ionicons.glyphMap,
    params: { serviceCategory: 'cleaning', filter: { skills: ['Cleaning', 'Deep Clean'] } },
  },
];

export const QuickServices: React.FC<QuickServicesProps> = ({
  onServicePress,
}) => {
  const haptics = useHaptics();
  const [activeId, setActiveId] = useState<string | null>(SERVICES[0].id);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SERVICES.map((service) => {
          const isActive = activeId === service.id;
          return (
            <TouchableOpacity
              key={service.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                haptics.buttonPress();
                setActiveId(isActive ? null : service.id);
                onServicePress(service.params);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Find ${service.name.toLowerCase()} contractors`}
            >
              <Ionicons
                name={service.icon}
                size={24}
                color={isActive ? theme.colors.textPrimary : theme.colors.textSecondary}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {service.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginHorizontal: -24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 18,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 68,
  },
  tabActive: {
    borderBottomColor: theme.colors.textPrimary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
});

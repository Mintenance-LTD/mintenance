/**
 * ContractorCard Component
 * 
 * Displays contractor info card at bottom of map.
 * 
 * @filesize Target: <90 lines
 * @compliance Single Responsibility - Card display
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { Contractor } from '../viewmodels/ExploreMapViewModel';

interface ContractorCardProps {
  contractor: Contractor;
  onPress: () => void;
}

export const ContractorCard: React.FC<ContractorCardProps> = ({
  contractor,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{contractor.name}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={theme.colors.warning} />
          <Text style={styles.rating}>{contractor.rating}</Text>
          <Text style={styles.reviews}>({contractor.reviewCount} reviews)</Text>
        </View>
        <View style={styles.servicesRow}>
          {contractor.services.map((service, index) => (
            <View key={index} style={styles.serviceTag}>
              <Text style={styles.serviceText}>{service}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.distance}>{contractor.distance} away</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.base,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.borderLight,
    marginRight: theme.spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  rating: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: 4,
  },
  reviews: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginLeft: 4,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  serviceTag: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  serviceText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  distance: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
});

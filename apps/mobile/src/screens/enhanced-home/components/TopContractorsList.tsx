/**
 * TopContractorsList Component
 * 
 * List of top-rated contractors nearby.
 * 
 * @filesize Target: <120 lines
 * @compliance Single Responsibility - Contractors list display
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { TopContractor } from '../viewmodels/EnhancedHomeViewModel';

interface TopContractorsListProps {
  contractors: TopContractor[];
  onContractorPress: (contractorId: string) => void;
  onSeeAllPress: () => void;
}

export const TopContractorsList: React.FC<TopContractorsListProps> = ({
  contractors,
  onContractorPress,
  onSeeAllPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Top Contractors</Text>
        <TouchableOpacity onPress={onSeeAllPress}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {contractors.map((contractor) => (
        <TouchableOpacity
          key={contractor.id}
          style={styles.contractorCard}
          onPress={() => onContractorPress(contractor.id)}
        >
          <View style={styles.contractorImage} />
          <View style={styles.contractorInfo}>
            <Text style={styles.contractorName}>{contractor.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={theme.colors.warning} />
              <Text style={styles.rating}>{contractor.rating}</Text>
              <Text style={styles.reviewCount}>({contractor.reviewCount} reviews)</Text>
            </View>
            <View style={styles.servicesRow}>
              {contractor.services.map((service, index) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceTagText}>{service}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.distance}>{contractor.distance} away</Text>
          </View>
          <TouchableOpacity style={styles.favoriteButton}>
            <Ionicons name="heart-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  seeAllText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  contractorCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  contractorImage: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.borderLight,
  },
  contractorInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  contractorName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  rating: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: 4,
  },
  reviewCount: {
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
    paddingVertical: 4,
  },
  serviceTagText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  distance: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

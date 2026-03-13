/**
 * TopContractorsList Component
 *
 * List of top-rated contractors nearby.
 *
 * @filesize Target: <120 lines
 * @compliance Single Responsibility - Contractors list display
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <Text style={styles.sectionTitle} accessibilityRole='header'>Top Contractors</Text>
        <TouchableOpacity
          onPress={onSeeAllPress}
          accessibilityRole='button'
          accessibilityLabel='See all contractors'
        >
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {contractors.map((contractor) => (
        <TouchableOpacity
          key={contractor.id}
          style={styles.contractorCard}
          onPress={() => onContractorPress(contractor.id)}
          accessibilityRole='button'
          accessibilityLabel={`${contractor.name}, rated ${contractor.rating} stars with ${contractor.reviewCount} reviews, ${contractor.distance} away`}
          accessibilityHint='Double tap to view contractor profile'
        >
          <View style={styles.contractorImage} />
          <View style={styles.contractorInfo}>
            <Text style={styles.contractorName}>{contractor.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#F59E0B" />
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
          <TouchableOpacity
            style={styles.favoriteButton}
            accessibilityRole='button'
            accessibilityLabel={`Add ${contractor.name} to favourites`}
          >
            <Ionicons name="heart-outline" size={20} color="#717171" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222222',
  },
  seeAllText: {
    fontSize: 15,
    color: '#717171',
  },
  contractorCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  contractorImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#EBEBEB',
  },
  contractorInfo: {
    flex: 1,
    marginLeft: 16,
  },
  contractorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 13,
    color: '#B0B0B0',
    marginLeft: 4,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  serviceTag: {
    backgroundColor: '#F7F7F7',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  serviceTagText: {
    fontSize: 12,
    color: '#717171',
  },
  distance: {
    fontSize: 13,
    color: '#B0B0B0',
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

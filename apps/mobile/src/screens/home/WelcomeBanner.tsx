/**
 * WelcomeBanner Component
 *
 * Segmented search bar: Property | Urgency | Service.
 * Each segment opens its own picker or the ServiceRequest modal.
 * Airbnb-style pill shape with soft shadow, no borders.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WelcomeBannerProps {
  onWherePress?: () => void;
  onUrgencyPress?: () => void;
  onServicePress?: () => void;
  propertyLabel?: string;
  urgencyLabel?: string;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  onWherePress,
  onUrgencyPress,
  onServicePress,
  propertyLabel,
  urgencyLabel,
}) => {
  return (
    <View style={styles.welcomeBanner}>
      <View style={styles.searchBar}>
        <TouchableOpacity
          style={styles.searchIconContainer}
          onPress={onServicePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Request a service"
        >
          <Ionicons name="search" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.searchSegments}>
          <TouchableOpacity style={styles.segment} onPress={onWherePress} activeOpacity={0.6}>
            <Text style={styles.segmentLabel}>Property</Text>
            <Text style={[styles.segmentValue, propertyLabel ? styles.segmentValueActive : null]} numberOfLines={1}>
              {propertyLabel || 'Select'}
            </Text>
          </TouchableOpacity>
          <View style={styles.segmentDivider} />
          <TouchableOpacity style={styles.segment} onPress={onUrgencyPress} activeOpacity={0.6}>
            <Text style={styles.segmentLabel}>Urgency</Text>
            <Text style={[styles.segmentValue, urgencyLabel && urgencyLabel !== 'Medium' ? styles.segmentValueActive : null]} numberOfLines={1}>
              {urgencyLabel || 'Medium'}
            </Text>
          </TouchableOpacity>
          <View style={styles.segmentDivider} />
          <TouchableOpacity style={styles.segment} onPress={onServicePress} activeOpacity={0.6}>
            <Text style={styles.segmentLabel}>Service</Text>
            <Text style={styles.segmentValue} numberOfLines={1}>Browse all</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  welcomeBanner: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchSegments: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#222222',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentValue: {
    fontSize: 13,
    color: '#717171',
    marginTop: 1,
  },
  segmentValueActive: {
    color: '#222222',
    fontWeight: '600',
  },
  segmentDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#EBEBEB',
  },
});

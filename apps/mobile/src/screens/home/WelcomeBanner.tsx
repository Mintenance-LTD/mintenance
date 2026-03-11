/**
 * WelcomeBanner Component
 *
 * Airbnb-style floating search pill with "What needs fixing?" prompt.
 * Tapping opens the service request modal. Filter chips below for
 * property and urgency selection.
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
    <View style={styles.wrapper}>
      {/* Main search pill */}
      <TouchableOpacity
        style={styles.searchPill}
        onPress={onServicePress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Request a service"
      >
        <View style={styles.searchIconCircle}>
          <Ionicons name="search" size={16} color="#FFFFFF" />
        </View>
        <View style={styles.searchTextBlock}>
          <Text style={styles.searchHeadline}>What needs fixing?</Text>
          <Text style={styles.searchHint}>
            {propertyLabel || 'Any property'} · {urgencyLabel || 'Any urgency'} · Browse all
          </Text>
        </View>
        <View style={styles.filterButton}>
          <Ionicons name="options-outline" size={16} color="#222222" />
        </View>
      </TouchableOpacity>

      {/* Quick filter chips */}
      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, propertyLabel ? styles.chipActive : null]}
          onPress={onWherePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Select property"
        >
          <Ionicons name="home-outline" size={14} color={propertyLabel ? '#222222' : '#717171'} />
          <Text style={[styles.chipText, propertyLabel ? styles.chipTextActive : null]}>
            {propertyLabel || 'Property'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, urgencyLabel && urgencyLabel !== 'Medium' ? styles.chipActive : null]}
          onPress={onUrgencyPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Select urgency"
        >
          <Ionicons
            name="time-outline"
            size={14}
            color={urgencyLabel && urgencyLabel !== 'Medium' ? '#222222' : '#717171'}
          />
          <Text
            style={[
              styles.chipText,
              urgencyLabel && urgencyLabel !== 'Medium' ? styles.chipTextActive : null,
            ]}
          >
            {urgencyLabel || 'Urgency'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chip}
          onPress={onServicePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Browse services"
        >
          <Ionicons name="grid-outline" size={14} color="#717171" />
          <Text style={styles.chipText}>Services</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  searchHeadline: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    letterSpacing: -0.2,
  },
  searchHint: {
    fontSize: 12,
    color: '#717171',
    marginTop: 1,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  chipActive: {
    borderColor: '#222222',
    backgroundColor: '#F7F7F7',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#717171',
  },
  chipTextActive: {
    color: '#222222',
    fontWeight: '600',
  },
});

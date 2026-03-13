/**
 * LocationPicker Component
 *
 * Location selection and display.
 *
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Location display
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LocationData } from '@mintenance/types';

interface LocationPickerProps {
  location: LocationData | null;
  locationStatus: 'loading' | 'success' | 'error';
  onRetry: () => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  location,
  locationStatus,
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>LOCATION</Text>

      {locationStatus === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#222222" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}

      {locationStatus === 'error' && (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="location-outline" size={24} color="#EF4444" />
          </View>
          <Text style={styles.errorText}>Failed to get location</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {locationStatus === 'success' && location && (
        <View style={styles.locationContainer}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={20} color="#10B981" />
          </View>
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>Meeting Location</Text>
            <Text style={styles.locationAddress}>{(location as LocationData & { address?: string }).address ?? ''}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#717171',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  errorIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  retryButton: {
    backgroundColor: '#222222',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#717171',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 15,
    color: '#222222',
    fontWeight: '500',
  },
});

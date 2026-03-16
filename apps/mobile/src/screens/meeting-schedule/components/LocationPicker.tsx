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
import { theme } from '../../../theme';
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
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>LOCATION</Text>

      {locationStatus === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.textPrimary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Getting your location...</Text>
        </View>
      )}

      {locationStatus === 'error' && (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="location-outline" size={24} color={theme.colors.error} />
          </View>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>Failed to get location</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.colors.textPrimary }]} onPress={onRetry}>
            <Text style={[styles.retryButtonText, { color: theme.colors.textInverse }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {locationStatus === 'success' && location && (
        <View style={[styles.locationContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
          <View style={[styles.locationIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="location" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.locationText}>
            <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>Meeting Location</Text>
            <Text style={[styles.locationAddress, { color: theme.colors.textPrimary }]}>{(location as LocationData & { address?: string }).address ?? ''}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  },
  retryButton: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 15,
    fontWeight: '500',
  },
});

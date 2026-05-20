/**
 * LocationPicker Component
 *
 * Location selection and display.
 *
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Location display
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
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
    <View style={[styles.container, { backgroundColor: me.surface }]}>
      <Text style={[styles.sectionTitle, { color: me.ink3 }]}>LOCATION</Text>

      {locationStatus === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='small' color={me.ink} />
          <Text style={[styles.loadingText, { color: me.ink2 }]}>
            Getting your location...
          </Text>
        </View>
      )}

      {locationStatus === 'error' && (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name='location-outline' size={24} color={me.errFg} />
          </View>
          <Text style={[styles.errorText, { color: me.errFg }]}>
            Failed to get location
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: me.ink }]}
            onPress={onRetry}
          >
            <Text style={[styles.retryButtonText, { color: me.onBrand }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {locationStatus === 'success' && location && (
        <View style={[styles.locationContainer, { backgroundColor: me.bg2 }]}>
          <View
            style={[styles.locationIcon, { backgroundColor: me.brandSoft }]}
          >
            <Ionicons name='location' size={20} color={me.brand} />
          </View>
          <View style={styles.locationText}>
            <Text style={[styles.locationLabel, { color: me.ink2 }]}>
              Meeting Location
            </Text>
            <Text style={[styles.locationAddress, { color: me.ink }]}>
              {(location as LocationData & { address?: string }).address ?? ''}
            </Text>
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
    ...me.shadow.card,
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
    backgroundColor: me.errBg,
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

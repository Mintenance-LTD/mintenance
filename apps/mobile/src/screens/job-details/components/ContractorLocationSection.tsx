/**
 * ContractorLocationSection - Toggle location tracking for active jobs
 *
 * Shows start/stop tracking button and current ETA when tracking.
 * Uses existing useJobTravelTracking hook.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobTravelTracking } from '../../../hooks/useJobTravelTracking';
import { me } from '../../../design-system/mint-editorial';

interface Props {
  jobId: string;
  destination?: {
    latitude: number;
    longitude: number;
  };
}

export const ContractorLocationSection: React.FC<Props> = ({
  jobId,
  destination,
}) => {
  const hasDestination =
    !!destination &&
    Number.isFinite(destination.latitude) &&
    Number.isFinite(destination.longitude);

  const { isTracking, eta, startTracking, stopTracking, markArrived, error } =
    useJobTravelTracking({
      jobId,
      destination: destination ?? {
        latitude: Number.NaN,
        longitude: Number.NaN,
      },
      // Auto-start tracking on mount when location permission is
      // already granted (no OS prompt). Removes the manual-tap gap
      // that left `contractor_locations = 0` in prod despite the
      // section rendering for every assigned contractor.
      autoStartIfPermitted: true,
    });

  const formatEta = (minutes: number) => {
    if (minutes < 1) return 'Arriving now';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Location Tracking</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isTracking ? (
        <View style={styles.trackingCard}>
          <View style={styles.trackingStatus}>
            <View style={styles.liveDot} />
            <Text style={styles.trackingText}>
              Sharing location with homeowner
            </Text>
          </View>

          {eta != null && eta > 0 && (
            <Text style={styles.etaText}>ETA: {formatEta(eta)}</Text>
          )}

          <View style={styles.trackingActions}>
            <TouchableOpacity
              style={styles.arrivedButton}
              onPress={markArrived}
              accessibilityRole='button'
              accessibilityLabel='Mark as arrived'
            >
              <Ionicons name='flag' size={16} color={me.onBrand} />
              <Text style={styles.arrivedButtonText}>Arrived</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopTracking}
              accessibilityRole='button'
              accessibilityLabel='Stop tracking'
            >
              <Ionicons name='stop-circle-outline' size={16} color={me.errFg} />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.startButton, !hasDestination && styles.disabledButton]}
          onPress={startTracking}
          disabled={!hasDestination}
          accessibilityRole='button'
          accessibilityLabel='Start location tracking'
        >
          <Ionicons name='navigate' size={18} color={me.onBrand} />
          <Text style={styles.startButtonText}>
            {hasDestination ? 'Share My Location' : 'Job location unavailable'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: me.errFg,
    marginBottom: 8,
  },
  trackingCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
  },
  trackingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: me.brand,
  },
  trackingText: {
    fontSize: 14,
    fontWeight: '500',
    color: me.ink,
  },
  etaText: {
    fontSize: 13,
    color: me.ink2,
    marginBottom: 12,
  },
  trackingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  arrivedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: me.brand,
    borderRadius: 28,
    paddingVertical: 10,
  },
  arrivedButtonText: {
    color: me.onBrand,
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: me.errBg,
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  stopButtonText: {
    color: me.errFg,
    fontSize: 14,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: me.ink,
    borderRadius: 28,
    paddingVertical: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
  startButtonText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
  },
});

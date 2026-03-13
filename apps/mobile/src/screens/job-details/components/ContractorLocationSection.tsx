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

interface Props {
  jobId: string;
}

export const ContractorLocationSection: React.FC<Props> = ({ jobId }) => {
  const {
    isTracking,
    eta,
    startTracking,
    stopTracking,
    markArrived,
    error,
  } = useJobTravelTracking({
    meetingId: jobId,
    jobId,
    destination: { latitude: 0, longitude: 0 },
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

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {isTracking ? (
        <View style={styles.trackingCard}>
          <View style={styles.trackingStatus}>
            <View style={styles.liveDot} />
            <Text style={styles.trackingText}>Sharing location with homeowner</Text>
          </View>

          {eta != null && eta > 0 && (
            <Text style={styles.etaText}>ETA: {formatEta(eta)}</Text>
          )}

          <View style={styles.trackingActions}>
            <TouchableOpacity
              style={styles.arrivedButton}
              onPress={markArrived}
              accessibilityRole="button"
              accessibilityLabel="Mark as arrived"
            >
              <Ionicons name="flag" size={16} color="#FFFFFF" />
              <Text style={styles.arrivedButtonText}>Arrived</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopTracking}
              accessibilityRole="button"
              accessibilityLabel="Stop tracking"
            >
              <Ionicons name="stop-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.startButton}
          onPress={startTracking}
          accessibilityRole="button"
          accessibilityLabel="Start location tracking"
        >
          <Ionicons name="navigate" size={18} color="#FFFFFF" />
          <Text style={styles.startButtonText}>Share My Location</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 8,
  },
  trackingCard: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#10B981',
  },
  trackingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
  },
  etaText: {
    fontSize: 13,
    color: '#717171',
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
    backgroundColor: '#10B981',
    borderRadius: 28,
    paddingVertical: 10,
  },
  arrivedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  stopButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#222222',
    borderRadius: 28,
    paddingVertical: 14,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ContractorLocationSection;

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../../meetingDetailsStyles';

interface TravelState {
  isTracking: boolean;
  eta: number | null;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
  markArrived: () => void;
}

/**
 * Contractor-only "Start traveling / Mark arrived / Stop" controls
 * driven by `useJobTravelTracking`.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44g).
 */
export function TravelTrackingPanel({ travel }: { travel: TravelState }) {
  return (
    <View style={styles.travelTrackingSection}>
      <Text style={styles.sectionTitle}>Travel Tracking</Text>
      {!travel.isTracking ? (
        <TouchableOpacity
          style={[styles.travelButton, styles.startTravelButton]}
          onPress={travel.startTracking}
          disabled={travel.error !== null}
        >
          <Ionicons name='navigate' size={24} color={me.onBrand} />
          <Text style={styles.travelButtonText}>Start Traveling</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.trackingActiveContainer}>
          <View style={styles.etaDisplay}>
            <Ionicons name='time' size={20} color={me.ink2} />
            <Text style={styles.etaText}>
              ETA: {travel.eta ? `${travel.eta} minutes` : 'Calculating...'}
            </Text>
          </View>
          <View style={styles.trackingButtons}>
            <TouchableOpacity
              style={[styles.travelButton, styles.arrivedButton]}
              onPress={travel.markArrived}
            >
              <Ionicons name='checkmark-circle' size={20} color={me.onBrand} />
              <Text style={styles.travelButtonText}>Mark Arrived</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.travelButton, styles.stopTravelButton]}
              onPress={travel.stopTracking}
            >
              <Ionicons name='stop-circle' size={20} color={me.onBrand} />
              <Text style={styles.travelButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {travel.error && <Text style={styles.errorText}>{travel.error}</Text>}
    </View>
  );
}

/**
 * ContractorLocationSection — toggle location tracking for active jobs.
 *
 * Mint Editorial polish per redesign-v2 homeowner-deck "Schedule &
 * live tracking" surface. Visual upgrades only — `useJobTravelTracking`
 * behaviour, autoStartIfPermitted, ETA calculation, and the
 * mark-arrived flow are unchanged.
 *
 * Layout:
 *   - Section eyebrow ("Location tracking").
 *   - Active state: brand-soft card with a live-dot row, large serif
 *     ETA, and primary "Arrived" + secondary "Stop" buttons.
 *   - Idle state: brand-fill "Share my location" button (was `me.ink`
 *     before — the editorial direction puts primary actions in mint).
 *
 * P0 reminder: `contractor_locations = 0` in prod is a shipping gap
 * (EAS release pending), not a code gap — the `autoStartIfPermitted`
 * default added in the 2026-05-09 audit removed the manual-tap
 * dependency that left the table empty.
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

const formatEta = (minutes: number): string => {
  if (minutes < 1) return 'Arriving now';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

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
      autoStartIfPermitted: true,
    });

  return (
    <View>
      <Text style={styles.sectionEyebrow}>Location tracking</Text>

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
            <View style={styles.etaBlock}>
              <Text style={styles.etaLabel}>ETA</Text>
              <Text style={styles.etaValue}>{formatEta(eta)}</Text>
            </View>
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
            {hasDestination ? 'Share my location' : 'Job location unavailable'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: me.errFg,
    marginBottom: 8,
  },
  // Active state — brand-soft mint card, visually anchors "you are
  // live right now". Mirrors the deck's tracking card.
  trackingCard: {
    backgroundColor: me.brandSoft,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: me.brand,
    ...me.shadow.card,
  },
  trackingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: me.brand,
  },
  trackingText: {
    fontSize: 13,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  etaBlock: {
    marginBottom: 14,
  },
  etaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  etaValue: {
    fontFamily: me.font.display,
    fontSize: 26,
    color: me.ink,
    letterSpacing: me.displayTracking,
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
    borderRadius: 12,
    paddingVertical: 11,
  },
  arrivedButtonText: {
    color: me.onBrand,
    fontSize: 14,
    fontWeight: '700',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: me.surface,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  stopButtonText: {
    color: me.errFg,
    fontSize: 14,
    fontWeight: '700',
  },
  // Idle state — primary mint CTA (was me.ink dark before).
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: me.brand,
    borderRadius: 14,
    paddingVertical: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
  startButtonText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '700',
  },
});

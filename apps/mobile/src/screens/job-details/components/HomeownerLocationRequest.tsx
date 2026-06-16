/**
 * HomeownerLocationRequest — lets homeowners request contractor location
 * sharing and shows the live ETA card once the contractor is sharing.
 *
 * 2026-06-16: the fetch + Realtime subscription that used to live here was
 * lifted into `useContractorLiveLocation` so the banner, this card and the
 * map all read one subscription. This component now receives the derived
 * live state as a prop and only owns the "Request Live Location" action.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';
import type { ContractorLiveState } from '../../../hooks/useContractorLiveLocation';

interface Props {
  jobId: string;
  live: ContractorLiveState;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const HomeownerLocationRequest: React.FC<Props> = ({ jobId, live }) => {
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestLocation = async () => {
    setLoading(true);
    try {
      await mobileApiClient.post(`/api/jobs/${jobId}/request-location`);
      setRequested(true);
    } catch {
      Alert.alert(
        'Unable to Request',
        'Could not send location request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const { isLive, hasArrived, eta, lastFix } = live;

  if (isLive) {
    return (
      <View>
        <Text style={styles.sectionLabel}>Contractor Location</Text>
        <View style={styles.liveCard}>
          <View style={styles.statusRow}>
            <View style={styles.livePulse} />
            <Text style={styles.liveText}>
              {hasArrived ? 'Contractor arrived' : 'Sharing live location'}
            </Text>
          </View>
          {hasArrived ? (
            <Text style={styles.etaText}>On site</Text>
          ) : eta !== null ? (
            <Text style={styles.etaText}>
              {eta <= 0 ? 'Arriving now' : `~${eta} min away`}
            </Text>
          ) : (
            <Text style={styles.etaMuted}>Calculating arrival time…</Text>
          )}
          <Text style={styles.lastFixText}>
            {hasArrived
              ? `Arrived ${formatRelativeTime(lastFix)}`
              : `Last update: ${formatRelativeTime(lastFix)}`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionLabel}>Contractor Location</Text>

      {requested ? (
        <View style={styles.requestedCard}>
          <View style={styles.statusRow}>
            <Ionicons name='checkmark-circle' size={20} color={me.brand} />
            <Text style={styles.requestedText}>Location request sent</Text>
          </View>
          <Text style={styles.requestedSubtext}>
            The contractor will be notified to share their live location. Once
            they start sharing, ETA appears here automatically.
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.requestButton}
          onPress={handleRequestLocation}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel='Request contractor location'
        >
          <Ionicons name='navigate-outline' size={20} color={me.onBrand} />
          <Text style={styles.requestButtonText}>
            {loading ? 'Sending...' : 'Request Live Location'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.brand,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  requestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.onBrand,
  },
  requestedCard: {
    backgroundColor: me.brandSoft,
    borderRadius: 12,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  requestedText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.brand,
  },
  requestedSubtext: {
    fontSize: 13,
    color: me.ink2,
    marginLeft: 28,
  },
  liveCard: {
    backgroundColor: me.brandSoft,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  livePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: me.brand,
  },
  liveText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.brand,
  },
  etaText: {
    fontSize: 22,
    fontWeight: '700',
    color: me.ink,
    marginTop: 4,
  },
  etaMuted: {
    fontSize: 14,
    color: me.ink2,
    marginTop: 4,
  },
  lastFixText: {
    fontSize: 12,
    color: me.ink3,
  },
});

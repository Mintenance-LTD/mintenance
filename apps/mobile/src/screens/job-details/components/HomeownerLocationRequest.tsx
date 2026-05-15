/**
 * HomeownerLocationRequest — lets homeowners request contractor location sharing
 * and see live ETA when the contractor is sharing.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';

interface Props {
  jobId: string;
}

export const HomeownerLocationRequest: React.FC<Props> = ({ jobId }) => {
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
            The contractor will be notified to share their live location.
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
});

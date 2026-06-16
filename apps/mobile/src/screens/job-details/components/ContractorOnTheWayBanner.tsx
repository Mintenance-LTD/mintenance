/**
 * ContractorOnTheWayBanner — the prominent "pop" a homeowner sees the
 * moment their contractor starts sharing location en route to the job
 * (2026-06-16). Non-blocking + dismissible: a push notification already
 * fires, and the live map directly below shows the actual movement.
 *
 * Rendered by JobDetailsScreen only when the viewer is the homeowner and
 * `contractorLive.isTraveling` is true.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface Props {
  eta: number | null;
}

export const ContractorOnTheWayBanner: React.FC<Props> = ({ eta }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const etaLabel =
    eta == null ? 'Tracking…' : eta <= 0 ? 'Arriving now' : `~${eta} min away`;

  return (
    <View style={styles.wrap}>
      <View
        style={styles.banner}
        accessibilityRole='alert'
        accessibilityLabel={`Your contractor is on the way, ${etaLabel}`}
      >
        <View style={styles.iconWrap}>
          <View style={styles.pulse} />
          <Ionicons name='navigate' size={18} color={me.onBrand} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>Your contractor is on the way</Text>
          <Text style={styles.subtitle}>
            {etaLabel} · live on the map below
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole='button'
          accessibilityLabel='Dismiss'
        >
          <Ionicons name='close' size={18} color={me.onBrand} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: me.brand,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...me.shadow.btn,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: me.onBrand,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
});

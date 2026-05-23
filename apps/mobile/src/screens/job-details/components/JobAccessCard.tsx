/**
 * JobAccessCard — shows the assigned contractor the property access
 * details that the homeowner has filled in (key_safe_code, access
 * notes, utility locations). Mirrors what the web contractor page
 * (/contractor/jobs/[id]) already renders.
 *
 * 2026-05-23 audit: this surface didn't exist on mobile — contractors
 * could arrive on-site without the access instructions the web side
 * showed. The job API now returns `propertyAccess` with the same
 * 1h-before-start reveal window for `key_safe_code`, so we just have
 * to render whatever the server provided.
 *
 * Rendering rules:
 *   - Nothing to show → return null (no empty card with a header).
 *   - access_mode label is always rendered when set, so the
 *     contractor knows whether to expect a lock-box / smart-lock /
 *     in-person entry.
 *   - key_safe_code surfaces only when the API returns it (the
 *     server gates by `canRevealKeySafeCode`).
 *   - stopcock / gas / consumer-unit locations render whenever
 *     present — they're useful for emergency response regardless
 *     of the visit timing.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

export interface PropertyAccess {
  access_mode: 'key_safe' | 'smart_lock' | 'in_person' | string | null;
  key_safe_code: string | null;
  access_notes: string | null;
  stopcock_location: string | null;
  gas_isolator_location: string | null;
  consumer_unit_location: string | null;
}

interface Props {
  access: PropertyAccess | null | undefined;
}

const MODE_LABEL: Record<string, string> = {
  key_safe: 'Key safe',
  smart_lock: 'Smart lock — see instructions below',
  in_person: 'Homeowner will be home',
};

export const JobAccessCard: React.FC<Props> = ({ access }) => {
  if (!access) return null;

  const hasAnyDetail =
    !!access.access_mode ||
    !!access.key_safe_code ||
    !!access.access_notes ||
    !!access.stopcock_location ||
    !!access.gas_isolator_location ||
    !!access.consumer_unit_location;

  if (!hasAnyDetail) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name='key-outline' size={18} color={me.brand} />
        </View>
        <Text style={styles.title}>Access & contacts</Text>
      </View>

      {access.access_mode ? (
        <View style={styles.row}>
          <Text style={styles.label}>How to get in</Text>
          <Text style={styles.value}>
            {MODE_LABEL[access.access_mode] ?? access.access_mode}
          </Text>
        </View>
      ) : null}

      {access.key_safe_code ? (
        <View style={styles.row}>
          <Text style={styles.label}>Lock-box code</Text>
          <Text style={styles.code}>{access.key_safe_code}</Text>
        </View>
      ) : access.access_mode === 'key_safe' ? (
        <View style={styles.row}>
          <Text style={styles.label}>Lock-box code</Text>
          <Text style={styles.muted}>
            Reveals within 1 hour of your scheduled start.
          </Text>
        </View>
      ) : null}

      {access.access_notes ? (
        <View style={styles.row}>
          <Text style={styles.label}>Notes from the homeowner</Text>
          <Text style={styles.value}>{access.access_notes}</Text>
        </View>
      ) : null}

      {access.stopcock_location ? (
        <View style={styles.row}>
          <Text style={styles.label}>Stopcock</Text>
          <Text style={styles.value}>{access.stopcock_location}</Text>
        </View>
      ) : null}

      {access.gas_isolator_location ? (
        <View style={styles.row}>
          <Text style={styles.label}>Gas isolator</Text>
          <Text style={styles.value}>{access.gas_isolator_location}</Text>
        </View>
      ) : null}

      {access.consumer_unit_location ? (
        <View style={styles.row}>
          <Text style={styles.label}>Consumer unit</Text>
          <Text style={styles.value}>{access.consumer_unit_location}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: me.line,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 14,
    color: me.ink,
    lineHeight: 20,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '700',
    color: me.brand,
    letterSpacing: 2,
  },
  muted: {
    fontSize: 13,
    color: me.ink3,
    fontStyle: 'italic',
  },
});

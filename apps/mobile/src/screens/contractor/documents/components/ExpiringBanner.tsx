/**
 * ExpiringBanner — surfaces the soonest-expiring contractor document
 * (certification or insurance) within a 60-day window.
 *
 * Reference: redesign-v2 contractor business deck screen 11
 * "Documents". The deck shows an amber inline banner:
 *
 *   "Your public liability insurance expires in 22 days. Customers
 *    stop seeing you in Find Jobs the day it lapses."
 *
 * Why this matters operationally: UK landlords are legally required
 * to keep gas-safety certificates ≥ 2 years and EICRs ≥ 5 years, and
 * Mintenance's contractor matchmaker (`/api/contractors/match`) is
 * supposed to drop contractors with lapsed insurance. A banner that
 * flags expiry inside the app catches it before the customer-side
 * visibility drop — which is real revenue protection, not cosmetics.
 *
 * Self-hides when there is no expiring document.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';
import type { Document } from '../types';

interface Props {
  documents: Document[];
  /** Optional CTA — caller passes a navigator to AddCertification. */
  onRenew?: (doc: Document) => void;
}

const WINDOW_DAYS = 60;
const URGENT_DAYS = 14;

const daysUntil = (iso: string): number => {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return Number.POSITIVE_INFINITY;
  const ms = target - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

// Friendlier label for the most common cert names so the banner reads
// like the deck ("public liability insurance" rather than
// "Public Liability Insurance Cert — Aviva").
const friendlyName = (filename: string): string => {
  const head = filename.split('—')[0]?.trim() ?? filename;
  return head.toLowerCase();
};

export const ExpiringBanner: React.FC<Props> = ({ documents, onRenew }) => {
  // Find soonest-expiring not-yet-lapsed cert/insurance row.
  const soonest = documents
    .filter((d) => !!d.expires_at)
    .map((d) => ({ doc: d, days: daysUntil(d.expires_at as string) }))
    .filter((x) => x.days > -1 && x.days <= WINDOW_DAYS)
    .sort((a, b) => a.days - b.days)[0];

  if (!soonest) return null;

  const { doc, days } = soonest;
  const urgent = days <= URGENT_DAYS;
  const label = friendlyName(doc.filename);

  return (
    <View style={[styles.wrap, urgent && styles.wrapUrgent]}>
      <View style={styles.iconCol}>
        <Ionicons
          name={urgent ? 'warning' : 'alert-circle-outline'}
          size={18}
          color={urgent ? me.errFg : me.warnFg}
        />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.body}>
          Your <Text style={styles.strong}>{label}</Text>{' '}
          {days <= 0
            ? 'lapses today.'
            : `expires in ${days} day${days === 1 ? '' : 's'}.`}
        </Text>
        <Text style={styles.sub}>
          Customers stop seeing you in Find Jobs the day it lapses.
        </Text>
      </View>
      {onRenew && (
        <TouchableOpacity
          style={styles.cta}
          onPress={() => onRenew(doc)}
          accessibilityRole='button'
          accessibilityLabel={`Renew ${label}`}
        >
          <Text style={styles.ctaText}>Renew</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: me.warnBg,
    borderRadius: 14,
  },
  wrapUrgent: {
    backgroundColor: me.errBg,
  },
  iconCol: {
    paddingTop: 1,
  },
  textCol: {
    flex: 1,
  },
  body: {
    fontSize: 13,
    color: me.ink,
    lineHeight: 18,
  },
  strong: {
    fontWeight: '700',
  },
  sub: {
    fontSize: 11,
    color: me.ink2,
    marginTop: 3,
    lineHeight: 15,
  },
  cta: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: me.brand,
    alignSelf: 'center',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.onBrand,
  },
});

export default ExpiringBanner;

/**
 * ProfilePerformance — the four performance signals a homeowner uses to
 * judge a bidder: response time, on-time completion, repeat customers,
 * and platform tenure.
 *
 * Web parity (2026-07-31 audit P2-3): mobile fetched neither
 * /api/contractors/:id/metrics nor tenure, so these were absent entirely.
 *
 * IMPORTANT — empty states are deliberate. Web's equivalent
 * (ContractorPerformanceStats.tsx) renders the raw numbers, so a
 * contractor with no history is shown as "0% on-time completion, 0%
 * repeat customers, 0 years experience" — which reads as a BAD
 * tradesperson when the truth is "no data yet", and is unfair to anyone
 * new. Percentages derived from completed jobs are therefore shown as
 * "—" until there is at least one completed job to derive them from, and
 * tenure under a year reads "New" rather than "0".
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

export interface ProfilePerformanceProps {
  /** Free-text summary from /metrics, e.g. "< 2 hours". */
  responseTime?: string | null;
  /** Percentage 0-100, only meaningful when jobsCompleted > 0. */
  onTimeCompletion?: number | null;
  /** Percentage 0-100, only meaningful when jobsCompleted > 0. */
  repeatCustomers?: number | null;
  /** Whole years on the platform; 0 means "joined within the year". */
  yearsExperience?: number | null;
  /** Gate for the derived percentages — no jobs means no basis. */
  jobsCompleted: number;
}

const EMPTY = '—';

function percent(value: number | null | undefined, hasBasis: boolean): string {
  if (!hasBasis || value === null || value === undefined) return EMPTY;
  return `${Math.round(value)}%`;
}

export const ProfilePerformance: React.FC<ProfilePerformanceProps> = ({
  responseTime,
  onTimeCompletion,
  repeatCustomers,
  yearsExperience,
  jobsCompleted,
}) => {
  const hasBasis = jobsCompleted > 0;

  const tenure =
    yearsExperience === null || yearsExperience === undefined
      ? EMPTY
      : yearsExperience > 0
        ? `${yearsExperience}y`
        : 'New';

  const items: Array<{
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    bg: string;
    value: string;
    label: string;
  }> = [
    {
      key: 'response',
      icon: 'time-outline',
      tint: me.brand,
      bg: me.brandSoft,
      value: responseTime && responseTime.length > 0 ? responseTime : EMPTY,
      label: 'Responds in',
    },
    {
      key: 'ontime',
      icon: 'trending-up',
      tint: '#3B82F6',
      bg: '#DBEAFE',
      value: percent(onTimeCompletion, hasBasis),
      label: 'On time',
    },
    {
      key: 'repeat',
      icon: 'people-outline',
      tint: me.accent,
      bg: me.warnBg,
      value: percent(repeatCustomers, hasBasis),
      label: 'Repeat clients',
    },
    {
      key: 'tenure',
      icon: 'ribbon-outline',
      tint: me.brand,
      bg: me.brandSoft,
      value: tenure,
      label: 'On Mintenance',
    },
  ];

  return (
    <View style={styles.wrap} testID='profile-performance'>
      <Text style={styles.heading}>Performance</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View
            key={item.key}
            style={styles.cell}
            testID={`performance-${item.key}`}
            accessibilityLabel={`${item.label}: ${item.value === EMPTY ? 'not enough data yet' : item.value}`}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={16} color={item.tint} />
            </View>
            <View style={styles.textCol}>
              <Text
                style={styles.value}
                testID={`performance-${item.key}-value`}
              >
                {item.value}
              </Text>
              <Text style={styles.label}>{item.label}</Text>
            </View>
          </View>
        ))}
      </View>
      {!hasBasis && (
        <Text style={styles.footnote}>
          Some figures appear once this tradesperson completes their first job.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: me.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...me.shadow.card,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flexShrink: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: me.ink,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 11,
    color: me.ink2,
    marginTop: 1,
    fontWeight: '500',
  },
  footnote: {
    fontSize: 11,
    color: me.ink3,
    marginTop: 8,
    lineHeight: 15,
  },
});

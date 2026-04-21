/**
 * JobsNearYouPreview — read-only job cards for the final contractor
 * onboarding slide.
 *
 * Phase 1 closeout of the 2026-04-19 mobile-onboarding-audit PDF
 * (§5.3 Tier 1 step 4: "First value moment. No bid button yet.")
 *
 * Why sample data instead of a live feed?
 *   - At this point in the flow the contractor hasn't granted
 *     location permission yet, so the "nearby" query would have no
 *     centre to bias on.
 *   - The user is not yet authenticated with a contractor-shaped
 *     profile; the jobs-near-me endpoint would either return
 *     nothing or require an auth upgrade.
 *   - The audit's intent is psychological — "demand exists, finish
 *     verification and you can access it" — not a real-time data
 *     display. Three curated sample cards deliver that signal
 *     without auth coupling or a loading spinner.
 *
 * The post-verification ExploreMapScreen already shows the real
 * data, keyed by the live contractor_locations row. This preview
 * is intentionally decoupled.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface SampleJob {
  id: string;
  title: string;
  category: string;
  categoryIcon: IoniconName;
  budgetRange: string;
  distanceMi: string;
  urgency: 'high' | 'medium' | 'low';
}

const SAMPLE_JOBS: ReadonlyArray<SampleJob> = [
  {
    id: 'sample-1',
    title: 'Leaking kitchen tap — urgent',
    category: 'Plumbing',
    categoryIcon: 'water-outline',
    budgetRange: '£80 – £150',
    distanceMi: '1.2 mi',
    urgency: 'high',
  },
  {
    id: 'sample-2',
    title: 'Rewire bedroom lighting',
    category: 'Electrical',
    categoryIcon: 'flash-outline',
    budgetRange: '£200 – £350',
    distanceMi: '3.4 mi',
    urgency: 'medium',
  },
  {
    id: 'sample-3',
    title: 'Paint six fence panels',
    category: 'Painting',
    categoryIcon: 'brush-outline',
    budgetRange: '£120 – £200',
    distanceMi: '0.8 mi',
    urgency: 'low',
  },
];

/**
 * Urgency indicators use only theme tokens (no hex literals —
 * pre-commit hook blocks new ones). The visual is a coloured dot
 * + text instead of a filled badge, which reads cleanly without
 * needing errorLight / warningLight tokens that the theme doesn't
 * currently define.
 */
const URGENCY_STYLE: Record<
  SampleJob['urgency'],
  { label: string; color: string }
> = {
  high: { label: 'Urgent', color: theme.colors.error },
  medium: { label: 'This week', color: theme.colors.primary },
  low: { label: 'Flexible', color: theme.colors.textSecondary },
};

export const JobsNearYouPreview: React.FC = () => {
  return (
    <View style={styles.container}>
      {SAMPLE_JOBS.map((job) => (
        <View key={job.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.categoryWrap}>
              <Ionicons
                name={job.categoryIcon}
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.categoryText}>{job.category}</Text>
            </View>
            <View style={styles.urgencyRow}>
              <View
                style={[
                  styles.urgencyDot,
                  { backgroundColor: URGENCY_STYLE[job.urgency].color },
                ]}
              />
              <Text
                style={[
                  styles.urgencyText,
                  { color: URGENCY_STYLE[job.urgency].color },
                ]}
              >
                {URGENCY_STYLE[job.urgency].label}
              </Text>
            </View>
          </View>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {job.title}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Ionicons
                name='location-outline'
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.footerText}>{job.distanceMi}</Text>
            </View>
            <Text style={styles.budgetText}>{job.budgetRange}</Text>
          </View>
        </View>
      ))}

      <View style={styles.gateBanner}>
        <Ionicons
          name='lock-closed'
          size={14}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.gateText}>
          Finish verification to start bidding
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 10,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  budgetText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  gateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  gateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

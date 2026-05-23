/**
 * TodayRow — Mint Editorial v2 contractor "Today" snapshot.
 *
 * Replaces the heavy `<StatsSection>` (full-bleed "ACTIVE PORTFOLIO"
 * hero + 4-up Earnings/Completed/Rating/Success-Rate bento) that was
 * still mounting on the contractor dashboard after the 2026-05-22
 * editorial redesign.
 *
 * Mockup reference: redesign-v2/mobile-screens.jsx HomeC. The
 * contractor "Today" surface is a two-number inline row — jobs
 * scheduled today + cash expected — under the greeting, before the
 * NextUp card. Anything heavier than that pushes the actionable
 * content (NextUp, HotLeads) below the fold.
 *
 * The four legacy stats (Earnings/Completed/Rating/Success Rate) live
 * on the contractor Profile screen — the dashboard is for action, the
 * profile is for retrospective metrics.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { me } from '../../../design-system/mint-editorial';

interface ContractorStats {
  activeJobs?: number;
  monthlyEarnings?: number;
  todayJobsCount?: number;
  todayExpectedCash?: number;
}

interface Props {
  stats: ContractorStats | null | undefined;
}

const fmtGBP = (n: number | undefined): string => {
  const value = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

export const TodayRow: React.FC<Props> = ({ stats }) => {
  // Fall back to monthly figures if the per-day stats aren't wired yet —
  // the row still reads "today" semantically but uses the available
  // pipeline values so we don't render zeros for active contractors.
  const jobsCount = stats?.todayJobsCount ?? stats?.activeJobs ?? 0;
  const cash = stats?.todayExpectedCash ?? stats?.monthlyEarnings ?? 0;

  return (
    <View style={styles.wrap} accessibilityLabel='Today summary'>
      <Text style={styles.eyebrow}>Today</Text>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.value}>{jobsCount}</Text>
          <Text style={styles.label}>
            {jobsCount === 1 ? 'job' : 'jobs'} in pipeline
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cell}>
          <Text style={styles.value}>{fmtGBP(cash)}</Text>
          <Text style={styles.label}>expected cash</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: me.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: me.line,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  divider: {
    width: 1,
    backgroundColor: me.line,
    marginVertical: 4,
  },
  value: {
    fontFamily: me.font.display,
    fontSize: 28,
    lineHeight: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: me.ink3,
    fontWeight: '500',
  },
});

export default TodayRow;

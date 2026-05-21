/**
 * HotLeadsRail — "your bids that are still warm" rail for the
 * contractor dashboard, from contractor-mobile-audit.html screen 01.
 *
 * Reads pending bids from /api/contractor/bids?status=pending and
 * surfaces the three most recently updated. The brand-coloured "Hot"
 * pill + matching left rail indicates a bid the homeowner has touched
 * recently (job updated_at within the last 24h is the proxy until we
 * track explicit view events).
 *
 * Tapping a row navigates to the job detail; tapping the section title
 * jumps to the My Bids list.
 */
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { me } from '../../../design-system/mint-editorial';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { styles } from './HotLeadsRail.styles';

interface ContractorBid {
  id: string;
  job_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string | null;
  jobs?: {
    id?: string;
    title?: string;
    location?: string;
    budget?: number;
    updated_at?: string;
  } | null;
}

interface Props {
  onOpenJob: (jobId: string) => void;
  onSeeAll: () => void;
}

const HOT_WINDOW_HOURS = 24;
const MAX_ROWS = 3;

const fmtAmount = (n?: number): string => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  return `£${n.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const freshness = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return 'Now';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const isHot = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  const ms = Date.now() - new Date(iso).getTime();
  return !Number.isNaN(ms) && ms < HOT_WINDOW_HOURS * 60 * 60 * 1000;
};

export const HotLeadsRail: React.FC<Props> = ({ onOpenJob, onSeeAll }) => {
  const { data: bids = [], isLoading } = useQuery({
    queryKey: ['contractor-bids', 'pending'],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ bids: ContractorBid[] }>(
        '/api/contractor/bids?status=pending&limit=10'
      );
      return res.bids ?? [];
    },
  });

  const rows = useMemo(() => {
    return [...bids]
      .sort((a, b) => {
        const aTime = new Date(
          a.jobs?.updated_at || a.updated_at || a.created_at
        ).getTime();
        const bTime = new Date(
          b.jobs?.updated_at || b.updated_at || b.created_at
        ).getTime();
        return bTime - aTime;
      })
      .slice(0, MAX_ROWS);
  }, [bids]);

  // Don't render the section at all while loading or when there's
  // nothing pending — the dashboard already has plenty going on, and
  // an empty "Hot leads · 0" header would just be noise.
  if (isLoading || rows.length === 0) return null;

  const hotCount = rows.filter((r) =>
    isHot(r.jobs?.updated_at || r.updated_at)
  ).length;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        onPress={onSeeAll}
        style={styles.headerRow}
        accessibilityRole='button'
        accessibilityLabel='See all active bids'
      >
        <Text style={styles.eyebrow}>
          Active bids · {rows.length}
          {hotCount > 0 ? ` · ${hotCount} warm` : ''}
        </Text>
        <Text style={styles.seeAll}>See all →</Text>
      </TouchableOpacity>

      {rows.map((row) => {
        const updated = row.jobs?.updated_at || row.updated_at;
        const hot = isHot(updated);
        const subline = [row.jobs?.location, freshness(updated) + ' ago']
          .filter(Boolean)
          .join(' · ');
        return (
          <TouchableOpacity
            key={row.id}
            activeOpacity={0.85}
            onPress={() => onOpenJob(row.job_id)}
            style={[styles.row, hot && styles.rowHot]}
            accessibilityRole='button'
            accessibilityLabel={`${row.jobs?.title || 'Job'} bid for ${fmtAmount(row.amount)}`}
          >
            <View style={[styles.leftRail, hot && styles.leftRailHot]} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {row.jobs?.title || 'Job'} · {fmtAmount(row.amount)}
              </Text>
              {!!subline && (
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {subline}
                </Text>
              )}
            </View>
            <View style={[styles.pill, hot ? styles.pillHot : styles.pillCool]}>
              <Text
                style={[
                  styles.pillText,
                  hot ? styles.pillTextHot : styles.pillTextCool,
                ]}
              >
                {hot ? 'Warm' : freshness(updated)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default HotLeadsRail;

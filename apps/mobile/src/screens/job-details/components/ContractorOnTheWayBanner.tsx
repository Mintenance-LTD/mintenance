/**
 * ContractorOnTheWayBanner — the prominent "pop" a homeowner sees while their
 * contractor is en route to the job (2026-06-16, made stage-aware 2026-07-20).
 * Non-blocking + dismissible: a push notification already fires, and the live
 * map directly below shows the actual movement.
 *
 * The banner reflects the trip's `TravelStage` so the copy + colour evolve as
 * the contractor approaches instead of a single flat "on the way":
 *   on_the_way → mint  · ETA + distance
 *   nearby     → mint  · "almost here, a good time to open up"
 *   arriving   → green · "pulling up outside"
 *   late       → amber · "running a little late", updated ETA
 *
 * Rendered by JobDetailsScreen only when the viewer is the homeowner and
 * `contractorLive.isTraveling` is true, so the 'idle'/'arrived' stages never
 * reach it.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import type { TravelStage } from '../../../hooks/useContractorLiveLocation';

interface Props {
  stage: TravelStage;
  eta: number | null;
  /** Straight-line distance to the job in miles, when known. */
  distanceMiles?: number | null;
}

type StageStyle = {
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

// Per-stage colour + icon + headline. Subtitle is built separately because it
// folds in the live ETA/distance.
const STAGE_STYLE: Record<
  Exclude<TravelStage, 'idle' | 'arrived'>,
  StageStyle
> = {
  on_the_way: {
    bg: me.brand,
    icon: 'navigate',
    title: 'Your contractor is on the way',
  },
  nearby: {
    bg: me.brand,
    icon: 'navigate',
    title: 'Your contractor is almost here',
  },
  arriving: {
    bg: me.okFg,
    icon: 'location',
    title: 'Your contractor is arriving',
  },
  late: { bg: me.warnFg, icon: 'time-outline', title: 'Running a little late' },
};

function etaLabel(eta: number | null): string {
  if (eta == null) return 'Tracking…';
  if (eta <= 0) return 'Arriving now';
  return `~${eta} min`;
}

function distanceLabel(distanceMiles?: number | null): string {
  if (distanceMiles == null || !Number.isFinite(distanceMiles)) return '';
  // Under a tenth of a mile "0.0 mi" reads as broken — say "moments away".
  if (distanceMiles < 0.1) return ' · moments away';
  return ` · ${distanceMiles.toFixed(1)} mi`;
}

function subtitleFor(
  stage: TravelStage,
  eta: number | null,
  distanceMiles?: number | null
): string {
  switch (stage) {
    case 'arriving':
      return 'Pulling up outside now';
    case 'nearby':
      return `${etaLabel(eta)} away · a good time to open up`;
    case 'late':
      return `New ETA ${etaLabel(eta)} · thanks for your patience`;
    case 'on_the_way':
    default:
      return `${etaLabel(eta)} away${distanceLabel(distanceMiles)}`;
  }
}

export const ContractorOnTheWayBanner: React.FC<Props> = ({
  stage,
  eta,
  distanceMiles,
}) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  // 'idle'/'arrived' never render this banner (see docblock); fall back to the
  // on_the_way styling if a caller ever passes one so we never crash on a
  // missing key.
  const s =
    stage === 'idle' || stage === 'arrived'
      ? STAGE_STYLE.on_the_way
      : STAGE_STYLE[stage];
  const subtitle = subtitleFor(stage, eta, distanceMiles);

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.banner, { backgroundColor: s.bg }]}
        accessibilityRole='alert'
        accessibilityLabel={`${s.title}, ${subtitle}`}
      >
        <View style={styles.iconWrap}>
          <View style={styles.pulse} />
          <Ionicons name={s.icon} size={18} color={me.onBrand} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
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

/**
 * ContractorArrivedCard — the final beat of the "on the way" journey.
 *
 * Once the contractor is on site the live tracking hero has done its job, so
 * it collapses (JobDetailsScreen stops promoting the map to the top) and this
 * compact card takes its place: arrival confirmation plus an explicit handoff
 * to the work phase, so the homeowner knows what happens next rather than
 * being left on a map of someone who has already parked.
 *
 * Rendered by JobDetailsScreen only for the homeowner, when
 * `contractorLive.hasArrived` is true.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { travelPresentation } from '../../../hooks/useContractorLiveLocation';
import { me } from '../../../design-system/mint-editorial';

interface Props {
  /** Timestamp of the arrival fix; the GPS watcher stops once on site. */
  arrivedAtIso: string | null;
  /** Job status, so the handoff line matches where the lifecycle actually is. */
  jobStatus?: string;
}

/** "14:41" in UK time, or null when the timestamp is missing/unparseable. */
export function formatArrivalTime(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * What the homeowner should expect next. Before-photos are a hard gate on
 * starting a job, so naming them sets the right expectation for the pause
 * between "arrived" and "in progress".
 */
export function handoffLine(jobStatus?: string): string {
  if (jobStatus === 'in_progress') return 'Work is underway.';
  if (jobStatus === 'completed') return 'Work is complete — review the photos.';
  return 'Next: your contractor photographs the area before starting.';
}

export const ContractorArrivedCard: React.FC<Props> = ({
  arrivedAtIso,
  jobStatus,
}) => {
  // Title comes from the shared travel machine so "arrived" is worded the
  // same here, on the map badge, and on web.
  const { title } = travelPresentation('arrived', { eta: null });
  const time = formatArrivalTime(arrivedAtIso);
  const statusLabel = jobStatus === 'in_progress' ? 'In progress' : 'Starting';

  return (
    <View style={styles.wrap}>
      <View
        style={styles.card}
        accessibilityRole='summary'
        accessibilityLabel={`${title}${time ? `, arrived ${time}` : ''}. ${handoffLine(jobStatus)}`}
      >
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Ionicons name='checkmark' size={20} color={me.onBrand} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {time ? `Arrived ${time} · on site` : 'On site now'}
            </Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.nextRow}>
          <Ionicons name='camera-outline' size={15} color={me.brand} />
          <Text style={styles.nextText}>{handoffLine(jobStatus)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: me.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: me.line,
    padding: 14,
    ...me.shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: me.okFg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
  },
  subtitle: {
    fontSize: 12,
    color: me.ink3,
    marginTop: 1,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: me.okBg,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: me.okFg,
  },
  divider: {
    height: 1,
    backgroundColor: me.line2,
    marginVertical: 12,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextText: {
    flex: 1,
    fontSize: 12.5,
    color: me.ink2,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { styles as screenStyles } from '../jobDetailsStyles';

/**
 * The "Details" panel — Category / Urgency / Timeline.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44c).
 *
 * 2026-07-20 redesign: these were three tall, near-empty label/value rows
 * eating ~120px of vertical space above the fold. They're now a single
 * wrapped row of chips — same information, a fraction of the height, and
 * urgency is encoded in colour so it reads at a glance rather than only as
 * a word.
 */

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Urgency drives the chip tint so severity is visible without reading. */
function urgencyTone(urgency: string): { bg: string; fg: string } {
  switch (urgency.toLowerCase()) {
    case 'high':
    case 'urgent':
    case 'emergency':
      return { bg: me.errBg, fg: me.errFg };
    case 'low':
      return { bg: me.okBg, fg: me.okFg };
    case 'medium':
    default:
      return { bg: me.warnBg, fg: me.warnFg };
  }
}

function timelineLabel(status?: string): string {
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In progress';
  return 'Awaiting start';
}

function Chip({
  icon,
  label,
  bg,
  fg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={13} color={fg} />
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function JobDetailsList({
  category,
  urgency,
  status,
}: {
  category?: string;
  urgency?: string;
  status?: string;
}) {
  const urgencyValue = urgency ? cap(urgency) : 'Medium';
  const tone = urgencyTone(urgency ?? 'medium');

  return (
    <View style={screenStyles.sectionPadded}>
      <Text style={screenStyles.sectionLabel}>Details</Text>
      <View style={styles.chipRow}>
        <Chip
          icon='grid-outline'
          label={category ? cap(category) : 'General'}
          bg={me.cat.defaultBg}
          fg={me.cat.defaultFg}
        />
        <Chip
          icon='alert-circle-outline'
          label={`${urgencyValue} urgency`}
          bg={tone.bg}
          fg={tone.fg}
        />
        <Chip
          icon='calendar-outline'
          label={timelineLabel(status)}
          bg={me.bg2}
          fg={me.ink2}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

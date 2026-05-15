import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface TimelineEvent {
  label: string;
  date: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  done: boolean;
}

interface Props {
  createdAt: string;
  contractorSignedAt: string | null;
  homeownerSignedAt: string | null;
  status: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export function ContractTimeline({
  createdAt,
  contractorSignedAt,
  homeownerSignedAt,
  status,
}: Props) {
  const events: TimelineEvent[] = [
    {
      label: 'Contract Created',
      date: createdAt,
      icon: 'document-text',
      done: true,
    },
    {
      label: 'Sent to Homeowner',
      date: createdAt,
      icon: 'send',
      done: status !== 'draft',
    },
    {
      label: 'Contractor Signed',
      date: contractorSignedAt,
      icon: 'create',
      done: !!contractorSignedAt,
    },
    {
      label: 'Homeowner Signed',
      date: homeownerSignedAt,
      icon: 'checkmark-circle',
      done: !!homeownerSignedAt,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name='time-outline' size={16} color={me.brand} />
        <Text style={styles.sectionLabel}>TIMELINE</Text>
      </View>
      {events.map((ev, i) => (
        <View key={ev.label} style={styles.eventRow}>
          <View style={styles.lineCol}>
            <View style={[styles.dot, ev.done && styles.dotDone]}>
              <Ionicons
                name={ev.done ? ev.icon : 'ellipse-outline'}
                size={ev.done ? 14 : 12}
                color={ev.done ? me.onBrand : me.ink3}
              />
            </View>
            {i < events.length - 1 && (
              <View style={[styles.line, ev.done && styles.lineDone]} />
            )}
          </View>
          <View style={styles.eventContent}>
            <Text
              style={[styles.eventLabel, !ev.done && styles.eventLabelPending]}
            >
              {ev.label}
            </Text>
            {ev.date && ev.done && (
              <Text style={styles.eventDate}>{fmt(ev.date)}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: me.brand,
  },
  eventRow: {
    flexDirection: 'row',
    minHeight: 44,
  },
  lineCol: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: me.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: me.brand,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: me.line,
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: me.brand,
  },
  eventContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 12,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  eventLabelPending: {
    color: me.ink3,
  },
  eventDate: {
    fontSize: 12,
    color: me.ink2,
    marginTop: 2,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

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
        <Ionicons name='time-outline' size={16} color={theme.colors.primary} />
        <Text style={styles.sectionLabel}>TIMELINE</Text>
      </View>
      {events.map((ev, i) => (
        <View key={ev.label} style={styles.eventRow}>
          <View style={styles.lineCol}>
            <View style={[styles.dot, ev.done && styles.dotDone]}>
              <Ionicons
                name={ev.done ? ev.icon : 'ellipse-outline'}
                size={ev.done ? 14 : 12}
                color={ev.done ? '#fff' : theme.colors.textTertiary}
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
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: theme.colors.primary,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: theme.colors.primary,
  },
  eventContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 12,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  eventLabelPending: {
    color: theme.colors.textTertiary,
  },
  eventDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

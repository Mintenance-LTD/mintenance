/**
 * SurveyorSections - RICS condition rating, surveyor diagnosis, and
 * onsite-inspection (abstention) sections for the Building Assessment card.
 *
 * Sibling of AssessmentSections.tsx (kept separate for the file-size cap).
 *
 * @filesize Target: <200 lines
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

const RICS_DISPLAY: Record<
  1 | 2 | 3,
  { bg: string; text: string; label: string; meaning: string }
> = {
  1: {
    bg: '#DCFCE7',
    text: '#16A34A',
    label: 'Condition 1',
    meaning: 'No repair needed — normal maintenance',
  },
  2: {
    bg: '#FEF3C7',
    text: '#B45309',
    label: 'Condition 2',
    meaning: 'Needs repair, not urgent',
  },
  3: {
    bg: '#FEE2E2',
    text: '#DC2626',
    label: 'Condition 3',
    meaning: 'Serious — urgent repair or investigation',
  },
};

interface SurveyorSectionProps {
  ricsConditionRating?: number;
  taxonomyClassId?: string;
  probableCause?: string;
}

/** RICS condition rating + surveyor classification + probable cause. */
export function SurveyorSection({
  ricsConditionRating,
  taxonomyClassId,
  probableCause,
}: SurveyorSectionProps) {
  const rics =
    ricsConditionRating === 1 ||
    ricsConditionRating === 2 ||
    ricsConditionRating === 3
      ? RICS_DISPLAY[ricsConditionRating]
      : undefined;

  if (!rics && !taxonomyClassId && !probableCause) return null;

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Surveyor Assessment</Text>
      {rics && (
        <View style={[s.ricsBanner, { backgroundColor: rics.bg }]}>
          <Text style={[s.ricsLabel, { color: rics.text }]}>{rics.label}</Text>
          <Text style={[s.ricsMeaning, { color: rics.text }]}>
            {rics.meaning}
          </Text>
        </View>
      )}
      {taxonomyClassId ? (
        <Text style={s.bodyText}>
          <Text style={s.fieldLabel}>Classification: </Text>
          {taxonomyClassId.replace(/_/g, ' ')}
        </Text>
      ) : null}
      {probableCause ? (
        <Text style={s.bodyText}>
          <Text style={s.fieldLabel}>Probable cause: </Text>
          {probableCause}
        </Text>
      ) : null}
    </View>
  );
}

interface InspectionNeededSectionProps {
  reason?: string;
}

/** Abstention notice: AI could not diagnose reliably from the photos. */
export function InspectionNeededSection({
  reason,
}: InspectionNeededSectionProps) {
  return (
    <View style={[s.section, s.infoCallout]}>
      <View style={s.row}>
        <Ionicons name='search' size={18} color={me.infoFg} />
        <Text style={[s.sectionTitle, { color: me.infoFg, marginBottom: 0 }]}>
          Onsite inspection recommended
        </Text>
      </View>
      <Text style={[s.bodyText, { color: me.infoFg }]}>
        The AI could not diagnose this reliably from the photos alone
        {reason ? `: ${reason}` : '.'} Treat the details below as indicative
        only.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  bodyText: { fontSize: 14, color: me.ink2, lineHeight: 20, marginTop: 4 },
  fieldLabel: { fontWeight: '700', color: me.ink },
  ricsBanner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  ricsLabel: { fontSize: 14, fontWeight: '700' },
  ricsMeaning: { fontSize: 12, marginTop: 2 },
  infoCallout: { backgroundColor: me.infoBg, borderRadius: 12, padding: 14 },
});

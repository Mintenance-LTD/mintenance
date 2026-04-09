/**
 * AssessmentSections - Sub-components for Building Assessment card
 *
 * Extracted to keep AIAnalysisCard under 300 lines.
 *
 * @filesize Target: <200 lines
 * @compliance Single Responsibility - each section is its own component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

// --- Shared color helpers ---

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEE2E2', text: '#DC2626' },
  full: { bg: '#FEE2E2', text: '#DC2626' },
  severe: { bg: '#FFF7ED', text: '#EA580C' },
  midway: { bg: '#FFF7ED', text: '#EA580C' },
  moderate: { bg: '#FEF9C3', text: '#A16207' },
  medium: { bg: '#FEF9C3', text: '#A16207' },
  minimal: { bg: '#DCFCE7', text: '#16A34A' },
  early: { bg: '#DCFCE7', text: '#16A34A' },
  low: { bg: '#DCFCE7', text: '#16A34A' },
  none: { bg: '#DCFCE7', text: '#16A34A' },
};

const URGENCY_COLORS: Record<
  string,
  { bg: string; text: string; icon: string }
> = {
  immediate: { bg: '#FEE2E2', text: '#DC2626', icon: 'alert-circle' },
  urgent: { bg: '#FFF7ED', text: '#EA580C', icon: 'warning' },
  soon: { bg: '#FEF9C3', text: '#A16207', icon: 'time' },
  planned: { bg: '#DCFCE7', text: '#16A34A', icon: 'calendar' },
  monitor: { bg: '#EFF6FF', text: '#2563EB', icon: 'eye' },
};

export function getSeverityStyle(severity: string) {
  return SEVERITY_COLORS[severity] ?? { bg: '#F3F4F6', text: '#6B7280' };
}

// --- Section Components ---

interface DamageSectionProps {
  damageType: string;
  severity: string;
  description: string;
  detectedItems?: string[];
}

export function DamageSection({
  damageType,
  severity,
  description,
  detectedItems,
}: DamageSectionProps) {
  const sev = getSeverityStyle(severity);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Damage Assessment</Text>
      <View style={s.row}>
        <View style={[s.tag, { backgroundColor: '#EEF2FF' }]}>
          <Text style={[s.tagText, { color: '#4F46E5' }]}>
            {damageType.replace(/_/g, ' ')}
          </Text>
        </View>
        <View style={[s.tag, { backgroundColor: sev.bg }]}>
          <Text style={[s.tagText, { color: sev.text }]}>{severity}</Text>
        </View>
      </View>
      <Text style={s.bodyText}>{description}</Text>
      {detectedItems && detectedItems.length > 0 && (
        <View style={s.chipRow}>
          {detectedItems.map((item, i) => (
            <View key={i} style={s.chip}>
              <Text style={s.chipText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface HomeownerSectionProps {
  whatIsIt: string;
  whatToDo: string;
}

export function HomeownerSection({
  whatIsIt,
  whatToDo,
}: HomeownerSectionProps) {
  return (
    <View style={[s.section, s.blueCallout]}>
      <View style={s.row}>
        <Ionicons name='information-circle' size={18} color='#2563EB' />
        <Text style={[s.sectionTitle, { color: '#1E40AF', marginBottom: 0 }]}>
          What this means
        </Text>
      </View>
      <Text style={[s.bodyText, { color: '#1E3A5F' }]}>{whatIsIt}</Text>
      {whatToDo ? (
        <Text style={[s.bodyText, { color: '#1D4ED8', fontWeight: '600' }]}>
          Action: {whatToDo}
        </Text>
      ) : null}
    </View>
  );
}

interface SafetySectionProps {
  safetyScore: number;
  hazards: Array<{ type: string; description: string }>;
}

export function SafetySection({ safetyScore, hazards }: SafetySectionProps) {
  return (
    <View style={[s.section, s.redCallout]}>
      <View style={s.row}>
        <Ionicons name='alert-circle' size={18} color='#DC2626' />
        <Text style={[s.sectionTitle, { color: '#991B1B', marginBottom: 0 }]}>
          Safety Hazards
        </Text>
      </View>
      <Text style={[s.bodyText, { color: '#7F1D1D' }]}>
        Safety Score: {safetyScore}/100
      </Text>
      {hazards.map((h, i) => (
        <View key={i} style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={[s.bodyText, { color: '#991B1B', flex: 1 }]}>
            <Text style={{ fontWeight: '700' }}>{h.type}: </Text>
            {h.description}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface CostSectionProps {
  min: number;
  recommended: number;
  max: number;
  estimatedTime?: string;
  materials?: Array<{ name: string; quantity: string; estimatedCost: number }>;
}

export function CostSection({
  min,
  recommended,
  max,
  estimatedTime,
  materials,
}: CostSectionProps) {
  const pct = max > min ? ((recommended - min) / (max - min)) * 100 : 50;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Cost Estimate</Text>
      <Text style={s.costMain}>
        {'\u00A3'}
        {recommended.toLocaleString()}
      </Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.min(100, pct)}%` }]} />
      </View>
      <View style={s.costRange}>
        <Text style={s.costLabel}>
          {'\u00A3'}
          {min.toLocaleString()}
        </Text>
        <Text style={s.costLabel}>
          {'\u00A3'}
          {max.toLocaleString()}
        </Text>
      </View>
      {estimatedTime ? (
        <Text style={s.metaText}>Est. time: {estimatedTime}</Text>
      ) : null}
      {materials && materials.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={s.subLabel}>Materials</Text>
          {materials.map((m, i) => (
            <View key={i} style={s.materialRow}>
              <Text style={[s.bodyText, { flex: 1, marginRight: 8 }]}>
                {m.name} ({m.quantity})
              </Text>
              <Text style={[s.bodyText, { fontWeight: '600' }]}>
                {'\u00A3'}
                {m.estimatedCost}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface InsuranceSectionProps {
  riskScore: number;
  premiumImpact: string;
  mitigationSuggestions?: string[];
}

export function InsuranceSection({
  riskScore,
  premiumImpact,
  mitigationSuggestions,
}: InsuranceSectionProps) {
  const impactStyle = getSeverityStyle(premiumImpact);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Insurance Risk</Text>
      <View style={s.row}>
        <View style={[s.barTrack, { flex: 1 }]}>
          <View style={[s.riskBarFill, { width: `${riskScore}%` }]} />
        </View>
        <Text style={s.metaText}>{riskScore}/100</Text>
      </View>
      <View
        style={[
          s.tag,
          { backgroundColor: impactStyle.bg, alignSelf: 'flex-start' },
        ]}
      >
        <Text style={[s.tagText, { color: impactStyle.text }]}>
          {premiumImpact} impact
        </Text>
      </View>
      {mitigationSuggestions && mitigationSuggestions.length > 0 && (
        <Text style={s.metaText}>{mitigationSuggestions[0]}</Text>
      )}
    </View>
  );
}

interface RepairsSectionProps {
  repairs: string[];
}

export function RepairsSection({ repairs }: RepairsSectionProps) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Repair Recommendations</Text>
      {repairs.map((r, i) => (
        <View key={i} style={s.bulletRow}>
          <Ionicons name='checkmark-circle' size={16} color='#16A34A' />
          <Text style={[s.bodyText, { flex: 1 }]}>{r}</Text>
        </View>
      ))}
    </View>
  );
}

interface UrgencyFooterProps {
  urgency: string;
  timeline: string;
}

export function UrgencyFooter({ urgency, timeline }: UrgencyFooterProps) {
  const u = URGENCY_COLORS[urgency] ??
    URGENCY_COLORS.monitor ?? { bg: '#EFF6FF', text: '#2563EB', icon: 'eye' };
  return (
    <View style={[s.urgencyBar, { backgroundColor: u.bg }]}>
      <Ionicons
        name={u.icon as keyof typeof Ionicons.glyphMap}
        size={16}
        color={u.text}
      />
      <Text style={[s.urgencyText, { color: u.text }]}>{urgency}</Text>
      <Text style={[s.urgencyTimeline, { color: u.text }]}>{timeline}</Text>
    </View>
  );
}

// --- Styles ---

const s = StyleSheet.create({
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tag: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  bodyText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 12, color: theme.colors.textPrimary },
  blueCallout: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14 },
  redCallout: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14 },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
    marginTop: 7,
  },
  costMain: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 8,
  },
  barTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: 6, backgroundColor: '#2563EB', borderRadius: 3 },
  riskBarFill: { height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  costRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  costLabel: { fontSize: 12, color: theme.colors.textTertiary },
  metaText: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 4 },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  urgencyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  urgencyText: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  urgencyTimeline: { fontSize: 12, flex: 1, textAlign: 'right' },
});

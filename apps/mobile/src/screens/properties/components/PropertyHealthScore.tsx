/**
 * PropertyHealthScore - Displays property maintenance health score
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface Job {
  id: string;
  status: string;
  budget: number;
  created_at: string;
  category?: string;
}

interface Props {
  jobs: Job[];
}

interface HealthResult {
  score: number;
  grade: 'excellent' | 'good' | 'needs_attention' | 'critical';
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function calculateHealth(jobs: Job[]): HealthResult {
  const completed = jobs.filter((j) => j.status === 'completed');
  const active = jobs.filter(
    (j) => j.status === 'in_progress' || j.status === 'assigned'
  );
  let score = 50; // base

  // Maintenance frequency: more completed jobs = better
  score += Math.min(completed.length * 5, 20);

  // Recent activity: check if any job completed in last 90 days
  const now = Date.now();
  const recentCompleted = completed.filter(
    (j) => now - new Date(j.created_at).getTime() < 90 * 24 * 60 * 60 * 1000
  );
  if (recentCompleted.length > 0) score += 15;

  // Fewer active issues = better
  if (active.length === 0) score += 10;
  else if (active.length <= 2) score += 5;

  // Category diversity
  const categories = new Set(completed.map((j) => j.category).filter(Boolean));
  score += Math.min(categories.size * 3, 10);

  score = Math.min(100, Math.max(0, score));

  if (score >= 80)
    return {
      score,
      grade: 'excellent',
      label: 'Excellent',
      color: '#10B981',
      icon: 'shield-checkmark',
    };
  if (score >= 60)
    return {
      score,
      grade: 'good',
      label: 'Good',
      color: '#3B82F6',
      icon: 'checkmark-circle',
    };
  if (score >= 40)
    return {
      score,
      grade: 'needs_attention',
      label: 'Needs Attention',
      color: '#F59E0B',
      icon: 'alert-circle',
    };
  return {
    score,
    grade: 'critical',
    label: 'Critical',
    color: '#EF4444',
    icon: 'warning',
  };
}

export const PropertyHealthScore: React.FC<Props> = ({ jobs }) => {
  const health = calculateHealth(jobs);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>PROPERTY HEALTH</Text>
      <View style={styles.scoreRow}>
        <View
          style={[styles.scoreBadge, { backgroundColor: health.color + '15' }]}
        >
          <Ionicons name={health.icon} size={24} color={health.color} />
        </View>
        <View style={styles.scoreInfo}>
          <Text style={styles.scoreNumber}>{health.score}</Text>
          <Text style={[styles.gradeLabel, { color: health.color }]}>
            {health.label}
          </Text>
        </View>
        <View style={styles.scoreBarWrap}>
          <View style={styles.scoreBarBg}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${health.score}%`, backgroundColor: health.color },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...me.shadow.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInfo: { marginLeft: 12, marginRight: 16 },
  scoreNumber: { fontSize: 24, fontWeight: '700', color: me.ink },
  gradeLabel: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  scoreBarWrap: { flex: 1 },
  scoreBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: me.bg2,
    overflow: 'hidden',
  },
  scoreBarFill: { height: 8, borderRadius: 4 },
});

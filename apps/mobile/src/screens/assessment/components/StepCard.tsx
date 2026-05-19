import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { me } from '../../../design-system/mint-editorial';
import { AssessmentStep } from '../types';

interface StepCardProps {
  step: AssessmentStep;
  stepNumber: number;
  onPress: () => void;
}

const STATUS_STYLES = {
  completed: {
    bg: '#D1FAE5',
    border: '#A7F3D0',
    iconBg: '#10B981',
    iconColor: '#FFFFFF',
    statusIcon: 'check-circle' as const,
    statusColor: '#10B981',
  },
  in_progress: {
    bg: '#DBEAFE',
    border: '#93C5FD',
    iconBg: '#3B82F6',
    iconColor: '#FFFFFF',
    statusIcon: 'play-circle-filled' as const,
    statusColor: '#3B82F6',
  },
  pending: {
    bg: me.surface,
    border: me.line,
    iconBg: me.bg2,
    iconColor: me.ink3,
    statusIcon: 'radio-button-unchecked' as const,
    statusColor: me.ink3,
  },
};

export const StepCard: React.FC<StepCardProps> = ({
  step,
  stepNumber,
  onPress,
}) => {
  const s = STATUS_STYLES[step.status];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: s.bg, borderColor: s.border }]}
      onPress={onPress}
      disabled={step.status === 'completed'}
      activeOpacity={0.7}
    >
      <View style={[styles.stepIcon, { backgroundColor: s.iconBg }]}>
        <Icon name={step.icon} size={20} color={s.iconColor} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.stepNumber}>Step {stepNumber}</Text>
          {step.required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>
      </View>
      <Icon name={s.statusIcon} size={22} color={s.statusColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  requiredBadge: {
    backgroundColor: me.errBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: me.ink2,
  },
});

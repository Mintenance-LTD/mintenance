import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AssessmentStep } from '../types';
import { theme } from '../../../theme';

interface StepCardProps {
  step: AssessmentStep;
  onPress: () => void;
}

const getStepStatusIcon = (status: AssessmentStep['status']) => {
  switch (status) {
    case 'completed':
      return <Icon name="check-circle" size={24} color={theme.colors.success} />;
    case 'in_progress':
      return <Icon name="pending" size={24} color={theme.colors.warning} />;
    default:
      return <Icon name="radio-button-unchecked" size={24} color={theme.colors.textTertiary} />;
  }
};

export const StepCard: React.FC<StepCardProps> = ({ step, onPress }) => {
  return (
    <TouchableOpacity
      style={[
        styles.stepCard,
        step.status === 'completed' && styles.stepCardCompleted,
      ]}
      onPress={onPress}
      disabled={step.status === 'completed'}
    >
      <View style={styles.stepIcon}>
        <Icon
          name={step.icon}
          size={24}
          color={step.status === 'completed' ? theme.colors.success : theme.colors.textSecondary}
        />
      </View>
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          {step.required && (
            <Text style={styles.requiredBadge}>Required</Text>
          )}
        </View>
        <Text style={styles.stepDescription}>{step.description}</Text>
      </View>
      {getStepStatusIcon(step.status)}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing[3],
    ...theme.shadows.base,
  },
  stepCardCompleted: {
    backgroundColor: theme.colors.primaryLight,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  stepTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  requiredBadge: {
    fontSize: 11,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.semibold,
    backgroundColor: theme.colors.errorLight ?? '#FEF2F2',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  stepDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});

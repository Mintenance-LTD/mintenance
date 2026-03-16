import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../../theme';
import { AssessmentStep } from '../types';

interface StepCardProps {
  step: AssessmentStep;
  onPress: () => void;
}

const getStepStatusIcon = (status: AssessmentStep['status']) => {
  switch (status) {
    case 'completed':
      return <Icon name="check-circle" size={24} color={theme.colors.primary} />;
    case 'in_progress':
      return <Icon name="pending" size={24} color={theme.colors.accent} />;
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
          color={step.status === 'completed' ? theme.colors.primary : theme.colors.textSecondary}
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
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
    marginRight: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  requiredBadge: {
    fontSize: 11,
    color: theme.colors.error,
    fontWeight: '600',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});

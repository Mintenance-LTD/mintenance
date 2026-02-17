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
      return <Icon name="pending" size={24} color="#FF9800" />;
    default:
      return <Icon name="radio-button-unchecked" size={24} color="#999" />;
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepCardCompleted: {
    backgroundColor: '#F0FFF4',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  requiredBadge: {
    fontSize: 11,
    color: '#F44336',
    fontWeight: '600',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

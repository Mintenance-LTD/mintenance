import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AssessmentStep } from '../types';

interface StepCardProps {
  step: AssessmentStep;
  onPress: () => void;
}

const getStepStatusIcon = (status: AssessmentStep['status']) => {
  switch (status) {
    case 'completed':
      return <Icon name="check-circle" size={24} color="#10B981" />;
    case 'in_progress':
      return <Icon name="pending" size={24} color="#F59E0B" />;
    default:
      return <Icon name="radio-button-unchecked" size={24} color="#B0B0B0" />;
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
          color={step.status === 'completed' ? '#10B981' : '#717171'}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  stepCardCompleted: {
    backgroundColor: '#D1FAE5',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
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
    color: '#222222',
  },
  requiredBadge: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepDescription: {
    fontSize: 13,
    color: '#717171',
  },
});

/**
 * JobLifecycleStepper - Horizontal stepper showing job lifecycle progress
 *
 * Displays 5 phases: Posted -> Assigned -> Contract -> In Progress -> Completed
 * Each step shows as completed, active, or future based on current job status.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface StepConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: StepConfig[] = [
  { label: 'Posted', icon: 'clipboard-outline' },
  { label: 'Assigned', icon: 'person-add-outline' },
  { label: 'Contract', icon: 'document-text-outline' },
  { label: 'In Progress', icon: 'hammer-outline' },
  { label: 'Completed', icon: 'checkmark-circle-outline' },
];

const CIRCLE_SIZE = 32;

type StepState = 'completed' | 'active' | 'future';

function getActiveStepIndex(
  jobStatus: string | undefined,
  contractStatus: string | null
): number {
  switch (jobStatus) {
    case 'posted':
      return 0;
    case 'assigned':
      if (contractStatus === 'accepted') return 2;
      if (contractStatus && contractStatus !== 'draft') return 2;
      return 1;
    case 'in_progress':
      return 3;
    case 'completed':
      return 4;
    case 'cancelled':
    case 'disputed':
      return -1;
    default:
      return 0;
  }
}

function getStepState(stepIndex: number, activeIndex: number): StepState {
  if (stepIndex < activeIndex) return 'completed';
  if (stepIndex === activeIndex) return 'active';
  return 'future';
}

interface StepCircleProps {
  step: StepConfig;
  state: StepState;
}

const StepCircle: React.FC<StepCircleProps> = ({ step, state }) => {
  const isCompleted = state === 'completed';
  const isActive = state === 'active';

  const circleStyle = [
    styles.circle,
    isCompleted && styles.circleCompleted,
    isActive && styles.circleActive,
    !isCompleted && !isActive && styles.circleFuture,
  ];

  const iconColor = isCompleted ? me.onBrand : isActive ? me.ink : me.ink3;

  const labelStyle = [
    styles.label,
    (isCompleted || isActive) && styles.labelActive,
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={circleStyle}>
        {isCompleted ? (
          <Ionicons name='checkmark' size={16} color={me.onBrand} />
        ) : (
          <Ionicons name={step.icon} size={14} color={iconColor} />
        )}
      </View>
      <Text style={labelStyle} numberOfLines={1}>
        {step.label}
      </Text>
    </View>
  );
};

interface ConnectorProps {
  completed: boolean;
}

const Connector: React.FC<ConnectorProps> = ({ completed }) => (
  <View
    style={[
      styles.connector,
      completed ? styles.connectorCompleted : styles.connectorFuture,
    ]}
  />
);

interface JobLifecycleStepperProps {
  jobStatus: string | undefined;
  contractStatus: string | null;
}

export const JobLifecycleStepper: React.FC<JobLifecycleStepperProps> = ({
  jobStatus,
  contractStatus,
}) => {
  const activeIndex = getActiveStepIndex(jobStatus, contractStatus);

  if (activeIndex < 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEPS.map((step, index) => (
          <React.Fragment key={step.label}>
            <StepCircle step={step} state={getStepState(index, activeIndex)} />
            {index < STEPS.length - 1 && (
              <Connector completed={index < activeIndex} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: me.surface,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    width: 52,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: me.ink,
  },
  circleActive: {
    backgroundColor: 'rgba(34,34,34,0.1)',
    borderWidth: 2,
    borderColor: me.ink,
  },
  circleFuture: {
    backgroundColor: me.bg2,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
    color: me.ink2,
    marginTop: 4,
  },
  labelActive: {
    color: me.ink,
    fontWeight: '600',
  },
  connector: {
    height: 2,
    flex: 1,
    marginTop: CIRCLE_SIZE / 2,
    marginHorizontal: -2,
  },
  connectorCompleted: {
    backgroundColor: me.ink,
  },
  connectorFuture: {
    backgroundColor: me.line,
  },
});

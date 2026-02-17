/**
 * JobTimelineScreen - Full job lifecycle progress tracker
 * Shows status steps: Posted -> Bids -> Assigned -> Contract -> Payment -> In Progress -> Completed -> Review -> Paid
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { useJobDetailsViewModel } from './viewmodels/JobDetailsViewModel';
import type { JobsStackParamList } from '../../navigation/types';

type Props = {
  route: RouteProp<JobsStackParamList, 'JobDetails'>;
  navigation: StackNavigationProp<JobsStackParamList>;
};

const LIFECYCLE_STEPS = [
  { key: 'posted', label: 'Posted', icon: 'megaphone-outline' as const, description: 'Job listed for contractors' },
  { key: 'bids', label: 'Bids Received', icon: 'cash-outline' as const, description: 'Contractors bidding on job' },
  { key: 'assigned', label: 'Assigned', icon: 'person-outline' as const, description: 'Contractor selected' },
  { key: 'contract', label: 'Contract Signed', icon: 'document-text-outline' as const, description: 'Both parties signed' },
  { key: 'payment', label: 'Payment in Escrow', icon: 'shield-checkmark-outline' as const, description: 'Funds held securely' },
  { key: 'in_progress', label: 'In Progress', icon: 'hammer-outline' as const, description: 'Work underway' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' as const, description: 'Work finished' },
  { key: 'review', label: 'Review & Approval', icon: 'star-outline' as const, description: 'Homeowner reviewing work' },
  { key: 'paid', label: 'Paid', icon: 'wallet-outline' as const, description: 'Payment released' },
];

const STATUS_TO_STEP_INDEX: Record<string, number> = {
  posted: 0,
  assigned: 2,
  in_progress: 5,
  completed: 6,
  cancelled: -1,
};

export const JobTimelineScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const viewModel = useJobDetailsViewModel(jobId);

  if (viewModel.jobLoading) {
    return <LoadingSpinner message="Loading timeline..." />;
  }

  if (viewModel.jobError || !viewModel.job) {
    return <ErrorView message="Failed to load job timeline" onRetry={viewModel.refetchJob} />;
  }

  const currentStepIndex = STATUS_TO_STEP_INDEX[viewModel.job.status] ?? 0;

  const getStepColor = (index: number) => {
    if (index < currentStepIndex) return theme.colors.success;
    if (index === currentStepIndex) return theme.colors.primary;
    return theme.colors.textTertiary;
  };

  const getStepOpacity = (index: number) => {
    if (index <= currentStepIndex) return 1;
    return 0.4;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Job Timeline" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{viewModel.job.title}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {viewModel.job.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.timeline}>
          {LIFECYCLE_STEPS.map((step, index) => (
            <View key={step.key} style={[styles.timelineStep, { opacity: getStepOpacity(index) }]}>
              <View style={styles.stepIndicator}>
                <View style={[
                  styles.stepCircle,
                  { backgroundColor: index <= currentStepIndex ? getStepColor(index) : theme.colors.border },
                ]}>
                  <Ionicons
                    name={index <= currentStepIndex ? 'checkmark' : step.icon}
                    size={16}
                    color={index <= currentStepIndex ? '#fff' : theme.colors.textTertiary}
                  />
                </View>
                {index < LIFECYCLE_STEPS.length - 1 && (
                  <View style={[
                    styles.stepLine,
                    { backgroundColor: index < currentStepIndex ? theme.colors.success : theme.colors.border },
                  ]} />
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={[
                  styles.stepLabel,
                  index === currentStepIndex && styles.currentStepLabel,
                ]}>
                  {step.label}
                </Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing[4],
  },
  jobInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[5],
    ...theme.shadows.sm,
  },
  jobTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary + '15',
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  timeline: {
    paddingLeft: theme.spacing[2],
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 72,
  },
  stepIndicator: {
    alignItems: 'center',
    width: 32,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    marginLeft: theme.spacing[3],
    paddingBottom: theme.spacing[4],
  },
  stepLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  currentStepLabel: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  stepDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

export default JobTimelineScreen;

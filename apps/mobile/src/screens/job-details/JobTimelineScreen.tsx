/**
 * JobTimelineScreen - Full job lifecycle progress tracker
 * Shows status steps: Posted -> Bids -> Assigned -> Contract -> Payment -> In Progress -> Completed -> Review -> Paid
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ScreenHeader,
  LoadingSpinner,
  ErrorView,
} from '../../components/shared';
import { useJobDetailsViewModel } from './viewmodels/JobDetailsViewModel';
import type { JobsStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type Props = {
  route: RouteProp<JobsStackParamList, 'JobTimeline'>;
  navigation: NativeStackNavigationProp<JobsStackParamList>;
};

const LIFECYCLE_STEPS = [
  {
    key: 'posted',
    label: 'Posted',
    icon: 'megaphone-outline' as const,
    description: 'Job listed for contractors',
  },
  {
    key: 'bids',
    label: 'Bids Received',
    icon: 'cash-outline' as const,
    description: 'Contractors bidding on job',
  },
  {
    key: 'assigned',
    label: 'Assigned',
    icon: 'person-outline' as const,
    description: 'Contractor selected',
  },
  {
    key: 'contract',
    label: 'Contract Signed',
    icon: 'document-text-outline' as const,
    description: 'Both parties signed',
  },
  {
    key: 'payment',
    label: 'Payment in Escrow',
    icon: 'shield-checkmark-outline' as const,
    description: 'Funds held securely',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    icon: 'hammer-outline' as const,
    description: 'Work underway',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: 'checkmark-circle-outline' as const,
    description: 'Work finished',
  },
  {
    key: 'review',
    label: 'Review & Approval',
    icon: 'star-outline' as const,
    description: 'Homeowner reviewing work',
  },
  {
    key: 'paid',
    label: 'Paid',
    icon: 'wallet-outline' as const,
    description: 'Payment released',
  },
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
    return <LoadingSpinner message='Loading timeline...' />;
  }

  if (viewModel.jobError || !viewModel.job) {
    return (
      <ErrorView
        message='Failed to load job timeline'
        onRetry={viewModel.refetchJob}
      />
    );
  }

  const currentStepIndex = STATUS_TO_STEP_INDEX[viewModel.job.status] ?? 0;

  const getStepColor = (index: number) => {
    if (index < currentStepIndex) return theme.colors.primary;
    if (index === currentStepIndex) return theme.colors.textPrimary;
    return theme.colors.textTertiary;
  };

  const getStepOpacity = (index: number) => {
    if (index <= currentStepIndex) return 1;
    return 0.4;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title='Job Timeline'
        showBack
        onBack={() => navigation.goBack()}
      />

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
            <View
              key={step.key}
              style={[styles.timelineStep, { opacity: getStepOpacity(index) }]}
            >
              <View style={styles.stepIndicator}>
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor:
                        index <= currentStepIndex
                          ? getStepColor(index)
                          : theme.colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={index <= currentStepIndex ? 'checkmark' : step.icon}
                    size={16}
                    color={
                      index <= currentStepIndex
                        ? theme.colors.textInverse
                        : theme.colors.textTertiary
                    }
                  />
                </View>
                {index < LIFECYCLE_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      {
                        backgroundColor:
                          index < currentStepIndex
                            ? theme.colors.primary
                            : theme.colors.border,
                      },
                    ]}
                  />
                )}
              </View>
              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepLabel,
                    index === currentStepIndex && styles.currentStepLabel,
                  ]}
                >
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollContent: {
    padding: 16,
  },
  jobInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  timeline: {
    paddingLeft: 8,
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
    marginLeft: 12,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  currentStepLabel: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  stepDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

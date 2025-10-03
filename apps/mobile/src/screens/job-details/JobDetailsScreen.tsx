/**
 * JobDetailsScreen Container
 * 
 * Main container for job details with status tracking and contractor assignment.
 * 
 * @filesize Target: <100 lines
 * @compliance MVVM - Thin container
 */

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { theme } from '../../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { useJobDetailsViewModel } from './viewmodels/JobDetailsViewModel';
import { JobStatusTracker } from '../../components/JobStatusTracker';
import { ContractorAssignment } from '../../components/ContractorAssignment';
import {
  JobHeader,
  AIAnalysisCard,
  JobImagesGallery,
  JobDetailsInfo,
} from './components';
import { JobsStackParamList } from '../../navigation/types';

type JobDetailsScreenRouteProp = RouteProp<JobsStackParamList, 'JobDetails'>;
type JobDetailsScreenNavigationProp = StackNavigationProp<JobsStackParamList, 'JobDetails'>;

interface Props {
  route: JobDetailsScreenRouteProp;
  navigation: JobDetailsScreenNavigationProp;
}

export const JobDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const viewModel = useJobDetailsViewModel(jobId);

  if (viewModel.jobLoading) {
    return <LoadingSpinner message="Loading job details..." />;
  }

  if (viewModel.jobError) {
    return (
      <ErrorView
        message="Failed to load job details"
        onRetry={viewModel.refetchJob}
      />
    );
  }

  if (!viewModel.job) {
    return (
      <ErrorView
        message="Job not found"
        onRetry={() => navigation.goBack()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Job Details"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <JobHeader job={viewModel.job} />

        <JobStatusTracker
          job={viewModel.job}
          onStatusUpdate={viewModel.handleJobStatusUpdate}
        />

        <ContractorAssignment
          job={viewModel.job}
          onContractorAssigned={viewModel.handleContractorAssigned}
        />

        <AIAnalysisCard
          aiAnalysis={viewModel.aiAnalysis}
          aiLoading={viewModel.aiLoading}
        />

        <JobImagesGallery job={viewModel.job} />

        <JobDetailsInfo job={viewModel.job} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
});

export default JobDetailsScreen;

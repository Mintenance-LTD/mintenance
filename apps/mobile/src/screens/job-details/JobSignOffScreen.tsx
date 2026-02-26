import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../../navigation/types';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { mobileApiClient } from '../../utils/mobileApiClient';

type Props = NativeStackScreenProps<JobsStackParamList, 'JobSignOff'>;

interface JobPhotoPair {
  before: string;
  after: string;
}

export const JobSignOffScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const queryClient = useQueryClient();
  const [changesText, setChangesText] = useState('');
  const [showChangesForm, setShowChangesForm] = useState(false);

  const { data: job, isLoading, error, refetch } = useQuery({
    queryKey: ['job-signoff', jobId],
    queryFn: async () => {
      const response = await mobileApiClient.get<{ job: {
        id: string;
        title: string;
        status: string;
        completion_confirmed_by_homeowner: boolean;
        contractor_name?: string;
        photos?: JobPhotoPair[];
      } }>(`/api/jobs/${jobId}`);
      return response.job;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      return mobileApiClient.post(`/api/jobs/${jobId}/confirm-completion`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-signoff', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      Alert.alert('Work Approved', 'Payment will be released to the contractor.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Failed to confirm completion.');
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: async (comments: string) => {
      return mobileApiClient.post(`/api/jobs/${jobId}/request-changes`, { comments });
    },
    onSuccess: () => {
      Alert.alert('Changes Requested', 'The contractor has been notified.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Failed to request changes.');
    },
  });

  const handleApprove = () => {
    Alert.alert(
      'Approve Work',
      'This will release the escrow payment to the contractor. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => confirmMutation.mutate() },
      ]
    );
  };

  const handleRequestChanges = () => {
    if (changesText.trim().length < 10) {
      Alert.alert('Error', 'Please describe the changes needed (at least 10 characters).');
      return;
    }
    requestChangesMutation.mutate(changesText.trim());
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView onRetry={refetch} />;
  if (!job) return <ErrorView onRetry={refetch} />;

  const isAlreadyConfirmed = job.completion_confirmed_by_homeowner;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Review Work" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
      >
        <Text style={styles.jobTitle}>{job.title}</Text>
        {job.contractor_name && (
          <Text style={styles.contractorName}>by {job.contractor_name}</Text>
        )}

        {isAlreadyConfirmed ? (
          <View style={styles.confirmedBanner}>
            <Text style={styles.confirmedText}>Work has been approved</Text>
            <Text style={styles.confirmedSubtext}>Payment is being processed.</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Review Completed Work</Text>
              <Text style={styles.sectionDescription}>
                Review the work completed by the contractor. If satisfied, approve to release
                payment. If changes are needed, describe what needs to be fixed.
              </Text>
            </View>

            {!showChangesForm ? (
              <View style={styles.actions}>
                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleApprove}
                  loading={confirmMutation.isPending}
                  leftIcon="checkmark-circle"
                >
                  Approve Work
                </Button>

                <Button
                  variant="outline"
                  fullWidth
                  onPress={() => setShowChangesForm(true)}
                  style={styles.secondaryAction}
                  leftIcon="create-outline"
                >
                  Request Changes
                </Button>
              </View>
            ) : (
              <View style={styles.changesForm}>
                <Text style={styles.changesLabel}>Describe changes needed:</Text>
                <TextInput
                  style={styles.changesInput}
                  multiline
                  numberOfLines={5}
                  placeholder="Please describe what needs to be fixed or changed..."
                  placeholderTextColor={theme.colors.placeholder}
                  value={changesText}
                  onChangeText={setChangesText}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>
                  {changesText.length}/10 min characters
                </Text>

                <View style={styles.changesActions}>
                  <Button
                    variant="secondary"
                    onPress={() => setShowChangesForm(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onPress={handleRequestChanges}
                    loading={requestChangesMutation.isPending}
                    disabled={changesText.trim().length < 10}
                  >
                    Submit Request
                  </Button>
                </View>
              </View>
            )}
          </>
        )}
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
  },
  content: {
    padding: theme.layout.screenPadding,
  },
  jobTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  contractorName: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[6],
  },
  confirmedBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[5],
    alignItems: 'center',
  },
  confirmedText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#047857',
  },
  confirmedSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: '#059669',
    marginTop: theme.spacing[1],
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  sectionDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  actions: {
    gap: theme.spacing[3],
  },
  secondaryAction: {
    marginTop: theme.spacing[1],
  },
  changesForm: {
    marginTop: theme.spacing[2],
  },
  changesLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  changesInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    minHeight: 120,
  },
  charCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: theme.spacing[1],
    marginBottom: theme.spacing[4],
  },
  changesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[3],
  },
  cancelButton: {
    minWidth: 100,
  },
});

export default JobSignOffScreen;

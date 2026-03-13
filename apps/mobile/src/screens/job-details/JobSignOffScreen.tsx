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
  if (error) return <ErrorView message="Failed to load job details" onRetry={refetch} />;
  if (!job) return <ErrorView message="Job not found" onRetry={refetch} />;

  const isAlreadyConfirmed = job.completion_confirmed_by_homeowner;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Review Work" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#222222" />}
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
                  title="Approve Work"
                />

                <Button
                  variant="secondary"
                  fullWidth
                  onPress={() => setShowChangesForm(true)}
                  style={styles.secondaryAction}
                  title="Request Changes"
                />
              </View>
            ) : (
              <View style={styles.changesForm}>
                <Text style={styles.changesLabel}>Describe changes needed:</Text>
                <TextInput
                  style={styles.changesInput}
                  multiline
                  numberOfLines={5}
                  placeholder="Please describe what needs to be fixed or changed..."
                  placeholderTextColor="#B0B0B0"
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
    backgroundColor: '#F7F7F7',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 4,
  },
  contractorName: {
    fontSize: 15,
    color: '#717171',
    marginBottom: 24,
  },
  confirmedBanner: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  confirmedText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#059669',
  },
  confirmedSubtext: {
    fontSize: 14,
    color: '#059669',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#717171',
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  secondaryAction: {
    marginTop: 4,
  },
  changesForm: {
    marginTop: 8,
  },
  changesLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
    marginBottom: 8,
  },
  changesInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#222222',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#B0B0B0',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  changesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    minWidth: 100,
  },
});

export default JobSignOffScreen;

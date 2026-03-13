import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAvailableJobs, useCreateJob } from '../hooks/useJobs';
import { useNetworkState } from '../hooks/useNetworkState';
import OfflineSyncStatus from './OfflineSyncStatus';
import { Job } from '@mintenance/types';
import { logger } from '../utils/logger';

interface JobListOfflineProps {
  onJobPress?: (job: Job) => void;
  showCreateButton?: boolean;
}

const JobListOffline: React.FC<JobListOfflineProps> = ({
  onJobPress,
  showCreateButton = false,
}) => {
  const {
    data: jobsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAvailableJobs();
  const jobs = (jobsData ?? []) as Job[];
  const { isOnline, connectionQuality } = useNetworkState();
  const createJobMutation = useCreateJob();

  const handleCreateJob = () => {
    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'You can create jobs while offline. They will be synced when you reconnect.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => createOfflineJob() },
        ]
      );
      return;
    }
    createOfflineJob();
  };

  const createOfflineJob = async () => {
    try {
      await createJobMutation.mutateAsync({
        title: 'Sample Job',
        description:
          'This is a sample job created while testing offline functionality',
        location: 'Test Location',
        budget: 1000,
        homeownerId: 'current-user-id',
        category: 'maintenance',
        priority: 'medium' as const,
      });

      logger.userAction('job_created', {
        isOnline,
        connectionQuality,
      });

      Alert.alert(
        'Success',
        isOnline
          ? 'Job created successfully!'
          : 'Job queued for creation when online'
      );
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes('queued')) {
        Alert.alert(
          'Offline Mode',
          'Job has been queued and will be created when you reconnect to the internet.'
        );
      } else {
        Alert.alert('Error', 'Failed to create job. Please try again.');
      }
    }
  };

  const handleRefresh = async () => {
    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'Cannot refresh data while offline. Showing cached data.',
        [{ text: 'OK' }]
      );
      return;
    }

    await refetch();
  };

  const renderJob = ({ item: job }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobItem}
      onPress={() => onJobPress?.(job)}
      disabled={!onJobPress}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle} numberOfLines={2}>
          {job.title}
        </Text>
        <View style={styles.jobPriority}>
          <Ionicons
            name={
              job.priority === 'high'
                ? 'alert-circle'
                : job.priority === 'medium'
                  ? 'warning'
                  : 'information-circle'
            }
            size={16}
            color={
              job.priority === 'high'
                ? '#EF4444'
                : job.priority === 'medium'
                  ? '#F59E0B'
                  : '#3B82F6'
            }
          />
        </View>
      </View>

      <Text style={styles.jobDescription} numberOfLines={3}>
        {job.description}
      </Text>

      <View style={styles.jobFooter}>
        <View style={styles.jobLocation}>
          <Ionicons
            name='location-outline'
            size={14}
            color="#717171"
          />
          <Text style={styles.jobLocationText}>{typeof job.location === 'string' ? job.location : 'Unknown location'}</Text>
        </View>
        <Text style={styles.jobBudget}>${(job.budget ?? 0).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={isOnline ? 'briefcase-outline' : 'cloud-offline-outline'}
        size={64}
        color="#B0B0B0"
      />
      <Text style={styles.emptyStateTitle}>
        {isOnline ? 'No Jobs Available' : 'Showing Cached Jobs'}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {isOnline
          ? 'Check back later for new opportunities'
          : 'Connect to the internet to see the latest jobs'}
      </Text>
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Ionicons
            name='information-circle-outline'
            size={16}
            color="#F59E0B"
          />
          <Text style={styles.offlineText}>You are currently offline</Text>
        </View>
      )}
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons
        name='alert-circle-outline'
        size={64}
        color="#EF4444"
      />
      <Text style={styles.errorTitle}>Failed to Load Jobs</Text>
      <Text style={styles.errorMessage}>
        {isOnline
          ? 'Please check your connection and try again'
          : 'You are offline. Showing cached data if available.'}
      </Text>
      {isOnline && (
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <OfflineSyncStatus showWhenOnline={false} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Jobs</Text>
        <View style={styles.headerRight}>
          {connectionQuality === 'poor' && (
            <View style={styles.connectionWarning}>
              <Ionicons
                name='cellular'
                size={16}
                color="#F59E0B"
              />
              <Text style={styles.connectionText}>Slow</Text>
            </View>
          )}
          {showCreateButton && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateJob}
              disabled={createJobMutation.isPending}
            >
              <Ionicons
                name='add-circle-outline'
                size={24}
                color="#222222"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isError ? (
        renderError()
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(job) => job.id}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => { handleRefresh(); }}
              colors={['#222222']}
              tintColor="#222222"
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            jobs.length === 0 ? styles.emptyContainer : undefined
          }
        />
      )}

      {createJobMutation.isPending && (
        <View style={styles.creatingOverlay}>
          <Text style={styles.creatingText}>
            {isOnline ? 'Creating job...' : 'Queuing job...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectionText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  createButton: {
    padding: 4,
  },
  jobItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginRight: 8,
  },
  jobPriority: {
    padding: 4,
  },
  jobDescription: {
    fontSize: 15,
    color: '#717171',
    lineHeight: 20,
    marginBottom: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  jobLocationText: {
    fontSize: 13,
    color: '#717171',
  },
  jobBudget: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222222',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 15,
    color: '#717171',
    textAlign: 'center',
    lineHeight: 22,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  offlineText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222222',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: '#717171',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#222222',
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  creatingOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  creatingText: {
    fontSize: 15,
    color: '#222222',
    textAlign: 'center',
  },
});

export default JobListOffline;

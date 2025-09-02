import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAvailableJobs, useCreateJob } from '../hooks/useJobs';
import { useNetworkState } from '../hooks/useNetworkState';
import OfflineSyncStatus from './OfflineSyncStatus';
import { theme } from '../theme';
import { Job } from '../types';
import { logger } from '../utils/logger';

interface JobListOfflineProps {
  onJobPress?: (job: Job) => void;
  showCreateButton?: boolean;
}

const JobListOffline: React.FC<JobListOfflineProps> = ({
  onJobPress,
  showCreateButton = false,
}) => {
  const { data: jobs = [], isLoading, isError, error, refetch } = useAvailableJobs();
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
        description: 'This is a sample job created while testing offline functionality',
        location: 'Test Location',
        budget: 1000,
        homeownerId: 'current-user-id',
        category: 'maintenance',
        priority: 'medium' as const,
      });

      logger.userAction('job_created', { 
        isOnline, 
        connectionQuality 
      });

      Alert.alert('Success', isOnline ? 'Job created successfully!' : 'Job queued for creation when online');
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes('queued')) {
        Alert.alert('Offline Mode', 'Job has been queued and will be created when you reconnect to the internet.');
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
              job.priority === 'high' ? 'alert-circle' :
              job.priority === 'medium' ? 'warning' : 'information-circle'
            }
            size={16}
            color={
              job.priority === 'high' ? theme.colors.error :
              job.priority === 'medium' ? theme.colors.warning : theme.colors.info
            }
          />
        </View>
      </View>
      
      <Text style={styles.jobDescription} numberOfLines={3}>
        {job.description}
      </Text>
      
      <View style={styles.jobFooter}>
        <View style={styles.jobLocation}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.jobLocationText}>{job.location}</Text>
        </View>
        <Text style={styles.jobBudget}>${job.budget.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={isOnline ? 'briefcase-outline' : 'cloud-offline-outline'}
        size={64}
        color={theme.colors.textTertiary}
      />
      <Text style={styles.emptyStateTitle}>
        {isOnline ? 'No Jobs Available' : 'Showing Cached Jobs'}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {isOnline
          ? 'Check back later for new opportunities'
          : 'Connect to the internet to see the latest jobs'
        }
      </Text>
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.warning} />
          <Text style={styles.offlineText}>You are currently offline</Text>
        </View>
      )}
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
      <Text style={styles.errorTitle}>Failed to Load Jobs</Text>
      <Text style={styles.errorMessage}>
        {isOnline 
          ? 'Please check your connection and try again'
          : 'You are offline. Showing cached data if available.'
        }
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
              <Ionicons name="cellular" size={16} color={theme.colors.warning} />
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
                name="add-circle-outline"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isError ? renderError() : (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(job) => job.id}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : undefined}
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  connectionText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.warning,
    fontWeight: theme.typography.fontWeight.medium,
  },
  createButton: {
    padding: theme.spacing[1],
  },
  jobItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[4],
    marginHorizontal: theme.spacing[4],
    marginVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
  },
  jobTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing[2],
  },
  jobPriority: {
    padding: theme.spacing[1],
  },
  jobDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing[3],
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    flex: 1,
  },
  jobLocationText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  jobBudget: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  emptyStateTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  emptyStateMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.warningLight,
    borderRadius: theme.borderRadius.base,
  },
  offlineText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    fontWeight: theme.typography.fontWeight.medium,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing[4],
  },
  retryButton: {
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.base,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.surface,
  },
  creatingOverlay: {
    position: 'absolute',
    bottom: theme.spacing[4],
    left: theme.spacing[4],
    right: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    ...theme.shadows.md,
  },
  creatingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});

export default JobListOffline;
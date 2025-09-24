import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Job } from '../types';
import { useUpdateJobStatus } from '../hooks/useJobs';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

interface JobStatusTrackerProps {
  job: Job;
  onStatusUpdate?: (job: Job) => void;
  showActions?: boolean;
}

interface StatusConfig {
  color: string;
  bgColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  posted: {
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    icon: 'megaphone-outline',
    label: 'Posted',
    description: 'Waiting for contractor bids',
  },
  assigned: {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    icon: 'person-outline',
    label: 'Assigned',
    description: 'Contractor assigned, waiting to start',
  },
  in_progress: {
    color: '#8B5CF6',
    bgColor: '#F3E8FF',
    icon: 'hammer-outline',
    label: 'In Progress',
    description: 'Work is currently underway',
  },
  completed: {
    color: '#10B981',
    bgColor: '#ECFDF5',
    icon: 'checkmark-circle-outline',
    label: 'Completed',
    description: 'Job has been finished',
  },
  cancelled: {
    color: '#EF4444',
    bgColor: '#FEF2F2',
    icon: 'close-circle-outline',
    label: 'Cancelled',
    description: 'Job was cancelled',
  },
};

const JOB_WORKFLOW: {
  status: string;
  nextActions: {
    status: string;
    label: string;
    requiresContractor?: boolean;
    requiredRole?: 'homeowner' | 'contractor';
  }[];
}[] = [
  {
    status: 'posted',
    nextActions: [
      {
        status: 'assigned',
        label: 'Assign Contractor',
        requiresContractor: true,
        requiredRole: 'homeowner',
      },
      { status: 'cancelled', label: 'Cancel Job', requiredRole: 'homeowner' },
    ],
  },
  {
    status: 'assigned',
    nextActions: [
      {
        status: 'in_progress',
        label: 'Start Work',
        requiredRole: 'contractor',
      },
      { status: 'cancelled', label: 'Cancel Job', requiredRole: 'homeowner' },
    ],
  },
  {
    status: 'in_progress',
    nextActions: [
      {
        status: 'completed',
        label: 'Mark Complete',
        requiredRole: 'contractor',
      },
    ],
  },
  {
    status: 'completed',
    nextActions: [],
  },
  {
    status: 'cancelled',
    nextActions: [],
  },
];

export const JobStatusTracker: React.FC<JobStatusTrackerProps> = ({
  job,
  onStatusUpdate,
  showActions = true,
}) => {
  const { user } = useAuth();
  const updateJobStatusMutation = useUpdateJobStatus();

  const currentConfig = STATUS_CONFIG[job.status];
  const workflow = JOB_WORKFLOW.find((w) => w.status === job.status);

  const handleStatusChange = (newStatus: any, requiresContractor?: boolean) => {
    const action = workflow?.nextActions.find((a) => a.status === newStatus);

    if (action?.requiredRole && user?.role !== action.requiredRole) {
      Alert.alert(
        'Access Denied',
        `Only ${action.requiredRole}s can perform this action`
      );
      return;
    }

    if (requiresContractor && !job.contractorId) {
      Alert.alert(
        'Contractor Required',
        'Please assign a contractor before changing status'
      );
      return;
    }

    const statusConfig = STATUS_CONFIG[newStatus];
    Alert.alert(
      'Confirm Status Change',
      `Change job status from "${currentConfig.label}" to "${statusConfig.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: () => performStatusUpdate(newStatus),
        },
      ]
    );
  };

  const performStatusUpdate = async (newStatus: any) => {
    try {
      logger.info('Updating job status', {
        jobId: job.id,
        oldStatus: job.status,
        newStatus,
        userId: user?.id,
        userRole: user?.role,
      });

      await updateJobStatusMutation.mutateAsync({
        jobId: job.id,
        status: newStatus as any,
        contractorId: job.contractorId || undefined,
      });

      // Call the optional callback
      if (onStatusUpdate) {
        onStatusUpdate({ ...job, status: newStatus });
      }

      Alert.alert(
        'Success',
        `Job status updated to ${STATUS_CONFIG[newStatus].label}`
      );
    } catch (error: any) {
      logger.error('Failed to update job status:', error);
      Alert.alert('Error', error.message || 'Failed to update job status');
    }
  };

  const getProgressPercentage = (): number => {
    const statusOrder: Job['status'][] = [
      'posted',
      'assigned',
      'in_progress',
      'completed',
    ];
    const currentIndex = statusOrder.indexOf(job.status);
    return (job.status as any) === 'cancelled'
      ? 0
      : ((currentIndex + 1) / statusOrder.length) * 100;
  };

  const renderProgressBar = () => {
    const percentage = getProgressPercentage();
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.round(percentage)}% Complete
        </Text>
      </View>
    );
  };

  const renderTimeline = () => {
    const statusOrder: Job['status'][] = [
      'posted',
      'assigned',
      'in_progress',
      'completed',
    ];

    return (
      <View style={styles.timeline}>
        {statusOrder.map((status, index) => {
          const config = STATUS_CONFIG[status];
          const isActive = status === job.status;
          const isPassed = statusOrder.indexOf(job.status) > index;
          const isCancelled = (job.status as any) === 'cancelled';

          return (
            <View key={status} style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineIcon,
                  {
                    backgroundColor:
                      isActive || isPassed ? config.color : '#E5E7EB',
                    opacity: isCancelled && !isActive ? 0.3 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={config.icon}
                  size={16}
                  color={isActive || isPassed ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>
              <Text
                style={[
                  styles.timelineLabel,
                  {
                    color: isActive ? config.color : '#6B7280',
                    fontWeight: isActive ? '600' : '400',
                    opacity: isCancelled && !isActive ? 0.3 : 1,
                  },
                ]}
              >
                {config.label}
              </Text>
              {index < statusOrder.length - 1 && (
                <View
                  style={[
                    styles.timelineLine,
                    {
                      backgroundColor: isPassed ? config.color : '#E5E7EB',
                      opacity: isCancelled ? 0.3 : 1,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Current Status Card */}
      <View
        style={[styles.statusCard, { backgroundColor: currentConfig.bgColor }]}
      >
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: currentConfig.color },
            ]}
          >
            <Ionicons name={currentConfig.icon} size={24} color='#FFFFFF' />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: currentConfig.color }]}>
              {currentConfig.label}
            </Text>
            <Text style={styles.statusDescription}>
              {currentConfig.description}
            </Text>
          </View>
        </View>

        {(job.status as any) !== 'cancelled' && renderProgressBar()}
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Timeline</Text>
        {renderTimeline()}
      </View>

      {/* Action Buttons */}
      {showActions && workflow && workflow.nextActions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Actions</Text>
          <View style={styles.actionButtons}>
            {workflow.nextActions.map((action) => {
              const actionConfig = STATUS_CONFIG[action.status];
              const canPerform =
                !action.requiredRole || user?.role === action.requiredRole;

              return (
                <TouchableOpacity
                  key={action.status}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: actionConfig.color,
                      opacity: canPerform ? 1 : 0.5,
                    },
                  ]}
                  onPress={() =>
                    handleStatusChange(action.status, action.requiresContractor)
                  }
                  disabled={!canPerform || updateJobStatusMutation.isPending}
                >
                  <Ionicons
                    name={actionConfig.icon}
                    size={18}
                    color='#FFFFFF'
                  />
                  <Text style={styles.actionButtonText}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Job Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {new Date(
                ((job as any).createdAt || (job as any).created_at) as any
              ).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>
              {new Date(
                ((job as any).updatedAt || (job as any).updated_at) as any
              ).toLocaleDateString()}
            </Text>
          </View>
          {job.contractorId && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Contractor</Text>
              <Text style={styles.infoValue}>Assigned</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Budget</Text>
            <Text style={styles.infoValue}>£{job.budget}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  timelineItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    zIndex: 2,
  },
  timelineLabel: {
    fontSize: 12,
    textAlign: 'center',
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 16,
    right: -50,
    width: 100,
    height: 2,
    zIndex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

export default JobStatusTracker;

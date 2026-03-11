import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Job } from '@mintenance/types';
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
    color: theme.colors.textPrimary,
    bgColor: theme.colors.backgroundSecondary,
    icon: 'megaphone-outline',
    label: 'Posted',
    description: 'Waiting for contractor bids',
  },
  assigned: {
    color: theme.colors.warning,
    bgColor: theme.colors.accentLight,
    icon: 'person-outline',
    label: 'Assigned',
    description: 'Contractor assigned, waiting to start',
  },
  in_progress: {
    color: theme.colors.warning,
    bgColor: theme.colors.accentLight,
    icon: 'hammer-outline',
    label: 'In Progress',
    description: 'Work is currently underway',
  },
  completed: {
    color: theme.colors.success,
    bgColor: theme.colors.primaryLight,
    icon: 'checkmark-circle-outline',
    label: 'Completed',
    description: 'Job has been finished',
  },
  cancelled: {
    color: theme.colors.error,
    bgColor: theme.colors.errorLight ?? '#FEF2F2',
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

  const handleStatusChange = (newStatus: string, requiresContractor?: boolean) => {
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

  const performStatusUpdate = async (newStatus: string) => {
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
        status: newStatus as Job['status'],
        contractorId: job.contractorId || undefined,
      });

      // Call the optional callback
      if (onStatusUpdate) {
        onStatusUpdate({ ...job, status: newStatus as Job['status'] });
      }

      Alert.alert(
        'Success',
        `Job status updated to ${STATUS_CONFIG[newStatus].label}`
      );
    } catch (error) {
      logger.error('Failed to update job status:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update job status');
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
    return job.status === 'cancelled'
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
          const isCancelled = job.status === 'cancelled';

          return (
            <View key={status} style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineIcon,
                  {
                    backgroundColor:
                      isActive || isPassed ? config.color : theme.colors.borderLight,
                    opacity: isCancelled && !isActive ? 0.3 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={config.icon}
                  size={16}
                  color={isActive || isPassed ? theme.colors.textInverse : theme.colors.textTertiary}
                />
              </View>
              <Text
                style={[
                  styles.timelineLabel,
                  {
                    color: isActive ? config.color : theme.colors.textSecondary,
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
                      backgroundColor: isPassed ? config.color : theme.colors.borderLight,
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
            <Ionicons name={currentConfig.icon} size={24} color={theme.colors.textInverse} />
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

        {job.status !== 'cancelled' && renderProgressBar()}
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
                    color={theme.colors.textInverse}
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
                job.createdAt ?? job.created_at ?? ''
              ).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>
              {new Date(
                job.updatedAt ?? job.updated_at ?? ''
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
    padding: theme.spacing.md,
  },
  statusCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: 2,
  },
  statusDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressContainer: {
    marginTop: theme.spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 3,
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  timelineItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    zIndex: 2,
  },
  timelineLabel: {
    fontSize: theme.typography.fontSize.xs,
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
    gap: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.xs,
  },
  actionButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
});

export default JobStatusTracker;

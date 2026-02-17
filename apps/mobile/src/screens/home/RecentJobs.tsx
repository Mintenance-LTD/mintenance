/**
 * RecentJobs Component
 *
 * Displays recent jobs for homeowners with real status badges and relative timestamps.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, getStatusColor } from '../../theme';

interface RecentJobsProps {
  jobs: any[];
  onViewAllPress: () => void;
  onJobPress?: (jobId: string) => void;
}

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const RecentJobs: React.FC<RecentJobsProps> = ({ jobs, onViewAllPress, onJobPress }) => {
  const displayJobs = jobs.slice(0, 3);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Service Requests</Text>
        <TouchableOpacity
          onPress={onViewAllPress}
          accessibilityRole="button"
          accessibilityLabel="View all recent jobs"
          accessibilityHint="Navigates to the full list of your jobs"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {displayJobs.length > 0 ? (
        displayJobs.map((job) => {
          const statusColor = getStatusColor(job.status || 'posted');
          return (
            <TouchableOpacity
              key={job.id}
              style={[styles.serviceRequestCard, { borderLeftWidth: 3, borderLeftColor: statusColor }]}
              onPress={() => onJobPress?.(job.id)}
              accessibilityRole="button"
              accessibilityLabel={`${job.title}, ${formatStatus(job.status || 'posted')}`}
            >
              <View style={styles.serviceRequestHeader}>
                <View style={styles.serviceRequestIcon}>
                  <Ionicons
                    name='construct'
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.serviceRequestInfo}>
                  <Text style={styles.serviceRequestTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={styles.serviceRequestMeta}>
                    {formatStatus(job.status || 'posted')} {job.created_at ? `\u00b7 ${getRelativeTime(job.created_at)}` : ''}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusBadgeText}>{formatStatus(job.status || 'posted')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={32} color={theme.colors.textTertiary} />
          <Text style={styles.emptyText}>No jobs posted yet</Text>
          <Text style={styles.sectionSubtitle}>
            Post your first job to get started!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  viewAllLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  serviceRequestCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  serviceRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceRequestIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceRequestInfo: {
    flex: 1,
  },
  serviceRequestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  serviceRequestMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: 12,
  },
});

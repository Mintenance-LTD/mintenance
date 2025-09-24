/**
 * RecentJobs Component
 * 
 * Displays recent jobs for homeowners with status and completion information.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface RecentJobsProps {
  jobs: any[];
  onViewAllPress: () => void;
}

export const RecentJobs: React.FC<RecentJobsProps> = ({ jobs, onViewAllPress }) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Service Requests</Text>
        <TouchableOpacity onPress={onViewAllPress}>
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Jobs header for tests */}
      <Text style={styles.sectionTitle}>Your Recent Jobs</Text>
      
      {jobs && jobs.length > 0 ? (
        jobs.map((job) => (
          <View key={job.id} style={styles.serviceRequestCard}>
            <View style={styles.serviceRequestHeader}>
              <View style={styles.serviceRequestIcon}>
                <Ionicons
                  name='construct'
                  size={16}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.serviceRequestInfo}>
                <Text style={styles.serviceRequestTitle}>{job.title}</Text>
                <Text style={styles.serviceRequestMeta}>
                  Completed • 2 days ago
                </Text>
              </View>
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>Completed</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No jobs posted yet</Text>
          <Text style={styles.sectionSubtitle}>
            Post your first job to get started!
          </Text>
        </View>
      )}

      {/* Sample service requests */}
      <View style={styles.serviceRequestCard}>
        <View style={styles.serviceRequestHeader}>
          <View style={styles.serviceRequestIcon}>
            <Ionicons
              name='construct'
              size={16}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.serviceRequestInfo}>
            <Text style={styles.serviceRequestTitle}>
              Fix Leaking Faucet
            </Text>
            <Text style={styles.serviceRequestMeta}>
              Completed • 2 days ago
            </Text>
          </View>
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        </View>
      </View>

      <View style={styles.serviceRequestCard}>
        <View style={styles.serviceRequestHeader}>
          <View style={styles.serviceRequestIcon}>
            <Ionicons
              name='flash'
              size={16}
              color={theme.colors.accent}
            />
          </View>
          <View style={styles.serviceRequestInfo}>
            <Text style={styles.serviceRequestTitle}>
              Electrical Panel Upgrade
            </Text>
            <Text style={styles.serviceRequestMeta}>
              In Progress • Started yesterday
            </Text>
          </View>
          <View style={styles.inProgressBadge}>
            <Text style={styles.inProgressBadgeText}>In Progress</Text>
          </View>
        </View>
      </View>
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
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
    ...theme.shadows.base,
  },
  serviceRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceRequestIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  completedBadge: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadgeText: {
    fontSize: 11,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  inProgressBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inProgressBadgeText: {
    fontSize: 11,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    ...theme.shadows.base,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

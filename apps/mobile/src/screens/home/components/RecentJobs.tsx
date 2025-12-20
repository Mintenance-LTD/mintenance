/**
 * Recent Jobs Component
 *
 * Displays recent jobs for homeowners or job opportunities for contractors.
 * Handles loading states and empty states gracefully.
 *
 * @filesize Target: <200 lines
 * @compliance Architecture principles - Single responsibility
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  budget?: number;
  location?: string;
  createdAt: string;
  contractorName?: string;
}

interface RecentJobsProps {
  jobs: Job[];
  loading: boolean;
  userRole: 'homeowner' | 'contractor';
  onJobPress: (jobId: string) => void;
  onViewAllPress: () => void;
  emptyStateMessage?: string;
}

export const RecentJobs: React.FC<RecentJobsProps> = ({
  jobs,
  loading,
  userRole,
  onJobPress,
  onViewAllPress,
  emptyStateMessage,
}) => {
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'posted':
      case 'open':
        return theme.colors.warning;
      case 'in_progress':
      case 'assigned':
        return theme.colors.info;
      case 'completed':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderJobItem = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobItem}
      onPress={() => onJobPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.jobDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.jobFooter}>
        <View style={styles.jobInfo}>
          {item.budget && (
            <Text style={styles.budgetText}>
              {formatCurrency(item.budget)}
            </Text>
          )}
          {item.location && (
            <Text style={styles.locationText}>
              <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
              {' '}{item.location}
            </Text>
          )}
        </View>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      {userRole === 'contractor' && item.contractorName && (
        <Text style={styles.contractorText}>by {item.contractorName}</Text>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={userRole === 'homeowner' ? 'briefcase-outline' : 'search-outline'}
        size={48}
        color={theme.colors.textSecondary}
      />
      <Text style={styles.emptyStateText}>
        {emptyStateMessage ||
         (userRole === 'homeowner'
           ? 'No recent jobs found'
           : 'No job opportunities available')}
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Loading jobs...</Text>
    </View>
  );

  const sectionTitle = userRole === 'homeowner' ? 'Recent Jobs' : 'Job Opportunities';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        {jobs.length > 0 && (
          <TouchableOpacity onPress={onViewAllPress}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        renderLoadingState()
      ) : jobs.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={jobs.slice(0, 5)} // Show only first 5 items
          renderItem={renderJobItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  jobItem: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
    textTransform: 'capitalize',
  },
  jobDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobInfo: {
    flex: 1,
  },
  budgetText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  contractorText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
});
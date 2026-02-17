/**
 * HomeownerDashboard Component
 *
 * Airbnb-style homeowner dashboard with profile header,
 * stats overview, quick services, and recent jobs.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { JobService } from '../../services/JobService';
import { BidService, Bid as ServiceBid } from '../../services/BidService';
import { theme } from '../../theme';
import { logger } from '../../utils/logger';
import { QuickServices } from './QuickServices';
import { RecentJobs } from './RecentJobs';
import { WelcomeBanner } from './WelcomeBanner';
import { StatsCards } from './StatsCards';
import { BidsReceived } from './BidsReceived';

const appIcon = require('../../../assets/icon.png');

export const HomeownerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<unknown>();

  const [homeownerJobs, setHomeownerJobs] = useState<unknown[]>([]);
  const [recentBids, setRecentBids] = useState<{ id: string; contractorName: string; jobTitle: string; amount: number; status: string; jobId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const jobs = await JobService.getUserJobs(user.id);
      setHomeownerJobs(jobs || []);

      // Fetch recent bids for homeowner's active jobs
      const activeJobIds = (jobs || [])
        .filter((j: { status?: string }) => j?.status === 'posted' || j?.status === 'assigned')
        .map((j: { id?: string }) => j?.id)
        .filter(Boolean) as string[];

      if (activeJobIds.length > 0) {
        const allBids: ServiceBid[] = [];
        for (const jobId of activeJobIds.slice(0, 5)) {
          try {
            const bids = await BidService.getBidsByJob(jobId, 'pending');
            allBids.push(...bids);
          } catch {
            // Skip individual job bid fetch errors
          }
        }
        setRecentBids(
          allBids.slice(0, 5).map((b) => ({
            id: b.id,
            contractorName: b.contractor
              ? `${b.contractor.first_name} ${b.contractor.last_name}`
              : 'Unknown',
            jobTitle: b.job?.title || 'Untitled job',
            amount: b.amount,
            status: b.status,
            jobId: b.job_id,
          }))
        );
      }
    } catch (error) {
      logger.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user) {
      try {
        const jobs = await JobService.getUserJobs(user.id);
        setHomeownerJobs(jobs || []);
      } catch {}
    }
    setRefreshing(false);
  };

  const openJobPosting = () => {
    navigation.navigate('JobsTab', { screen: 'JobPosting' });
  };

  const openServiceRequest = (params?: Record<string, unknown>) => {
    navigation.getParent?.()?.navigate('Modal', {
      screen: 'ServiceRequest',
      params,
    });
  };

  const openJobsList = () => {
    navigation.navigate('JobsTab', { screen: 'JobsList' });
  };

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadDashboardData()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userName = user?.firstName || user?.first_name || 'there';
  const userInitial = userName[0].toUpperCase();

  return (
    <View style={styles.container}>
      {/* Clean white top bar - Airbnb style */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.brandButton}
          onPress={() => navigation.navigate('HomeTab' as never)}
          accessibilityRole="button"
          accessibilityLabel="Mintenance home"
        >
          <Image source={appIcon} style={styles.brandIcon} />
          <View>
            <Text style={styles.brandText}>Mintenance</Text>
            <Text style={styles.brandSubtext}>Welcome back, {userName.toLowerCase()}!</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.getParent?.()?.navigate('Modal', { screen: 'Notifications' })}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('ProfileTab' as never)}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{userInitial}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        testID='home-scroll-view'
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        }
      >
        <WelcomeBanner user={user} onSearchPress={openServiceRequest} />

        <View style={styles.homeownerContent}>
          <StatsCards
            activeJobs={homeownerJobs.filter((j: any) => j?.status === 'in_progress' || j?.status === 'assigned').length}
            completedJobs={homeownerJobs.filter((j: any) => j?.status === 'completed').length}
          />

          <BidsReceived
            bids={recentBids}
            onViewAllPress={openJobsList}
            onReviewPress={(bidId) => {
              const bid = recentBids.find((b) => b.id === bidId);
              if (bid?.jobId) {
                navigation.navigate('JobsTab', { screen: 'BidReview', params: { jobId: bid.jobId } });
              }
            }}
          />

          <QuickServices
            onServicePress={openServiceRequest}
            onBrowseAllPress={openJobPosting}
          />

          <RecentJobs
            jobs={homeownerJobs}
            onViewAllPress={openJobsList}
            onJobPress={(jobId) => navigation.navigate('JobsTab', { screen: 'JobDetails', params: { jobId } })}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  brandText: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 34,
  },
  brandSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeownerContent: {
    paddingHorizontal: 24,
    backgroundColor: theme.colors.background,
    paddingTop: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

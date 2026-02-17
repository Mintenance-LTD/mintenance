/**
 * HomeownerDashboard Component
 * 
 * Displays the homeowner-specific dashboard with service shortcuts,
 * recent jobs, and previously used contractors.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { UserService, UserProfile } from '../../services/UserService';
import { JobService } from '../../services/JobService';
import { theme } from '../../theme';
import { useHaptics } from '../../utils/haptics';
import { logger } from '../../utils/logger';
import { ResponsiveGrid } from '../../components/responsive';
import { NavigationHeader } from '../../components/navigation';
import { QuickServices } from './QuickServices';
import { PreviousContractors } from './PreviousContractors';
import { RecentJobs } from './RecentJobs';
import { WelcomeBanner } from './WelcomeBanner';
import { StatsCards } from './StatsCards';
import { BidsReceived } from './BidsReceived';
// FindContractorsButton repurposed as "Post a Job" button

export const HomeownerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<unknown>();
  const haptics = useHaptics();

  const [previousContractors, setPreviousContractors] = useState<UserProfile[]>([]);
  const [homeownerJobs, setHomeownerJobs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPostJobButton, setShowPostJobButton] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async (opts?: { skipJobs?: boolean }) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Load homeowner jobs list
      if (!opts?.skipJobs) {
        try {
          const jobs = await JobService.getUserJobs(user.id);
          setHomeownerJobs(jobs || []);
        } catch (e) {
          // non-fatal
        }
      }

      // Previous contractors (optional)
      try {
        const contractors = await UserService.getPreviousContractors(user.id);
        setPreviousContractors(contractors || []);
      } catch (e) {
        setError('Failed to load dashboard data');
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
    await Promise.resolve();
    
    if (user?.role === 'homeowner') {
      try {
        const jobs = await JobService.getUserJobs(user.id);
        setHomeownerJobs(jobs || []);
      } catch {}
    }
    
    await loadDashboardData({ skipJobs: true });
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

  const openConversation = (params: Record<string, unknown>) => {
    navigation.navigate('MessagingTab', {
      screen: 'Messaging',
      params,
    });
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

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Mintenance"
        subtitle={user?.first_name ? `Welcome back, ${user.first_name}!` : 'Homeowner Dashboard'}
        onNotificationPress={() => navigation.navigate('NotificationsScreen')}
        userInitials={user?.first_name && user?.last_name ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : undefined}
        onUserPress={() => navigation.navigate('ProfileTab' as never)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        testID='home-scroll-view'
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <WelcomeBanner user={user} onSearchPress={openServiceRequest} />

        <View style={styles.homeownerContent}>
          <StatsCards
            activeJobs={homeownerJobs.filter((j: any) => j?.status === 'in_progress' || j?.status === 'assigned').length}
            completedJobs={homeownerJobs.filter((j: any) => j?.status === 'completed').length}
          />

          <BidsReceived
            bids={[]}
            onViewAllPress={openJobsList}
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

          <PreviousContractors
            contractors={previousContractors}
            onMessagePress={openConversation}
            onRehirePress={openServiceRequest}
          />
        </View>
      </ScrollView>

      {showPostJobButton && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={openJobPosting}
            accessibilityRole="button"
            accessibilityLabel="Post a job"
          >
            <Ionicons name="add-circle" size={20} color={theme.colors.textInverse} />
            <Text style={styles.floatingButtonText}>Post a Job</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => setShowPostJobButton(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
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
  homeownerContent: {
    paddingHorizontal: 20,
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
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  floatingButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    ...theme.shadows.large,
  },
  floatingButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: theme.colors.surface,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.base,
  },
});

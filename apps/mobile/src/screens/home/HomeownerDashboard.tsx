/**
 * HomeownerDashboard Component
 *
 * Full-bleed gradient hero dashboard with nav, greeting, stats,
 * CTA, bids section, appointments, and listing-style recent jobs.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn, SlideIn } from '../../components/animations/primitives';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { JobService } from '../../services/JobService';
import { BidService } from '../../services/BidService';
import { NotificationService } from '../../services/NotificationService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';

import { logger } from '../../utils/logger';
import { RecentJobs } from './RecentJobs';
import { BidsReceived } from './BidsReceived';
import { theme, gradients } from '../../theme';
import { styles } from './homeownerDashboardStyles';
import { DashboardProfileMenu } from './components/DashboardProfileMenu';
import { DashboardAppointmentsSection } from './components/DashboardAppointmentsSection';

const appIcon = require('../../../assets/icon.png');

export const HomeownerDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Jobs query
  const {
    data: jobsData,
    isLoading: jobsLoading,
    isError: jobsError,
    isFetching,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['homeownerJobs', user?.id],
    queryFn: () => JobService.getUserJobs(user!.id),
    enabled: !!user,
  });

  const homeownerJobs = jobsData || [];
  const activeJobIds = homeownerJobs
    .filter((j) => j?.status === 'posted' || j?.status === 'assigned')
    .map((j) => j?.id)
    .filter(Boolean) as string[];

  // Bids query
  const { data: recentBids = [], isLoading: bidsLoading } = useQuery({
    queryKey: ['homeownerBids', activeJobIds.slice(0, 10).join(',')],
    queryFn: async () => {
      const bids = await BidService.getBidsByJobs(
        activeJobIds.slice(0, 10),
        'pending'
      ).catch((err: unknown) => {
        logger.warn('Failed to fetch bids for jobs', {
          error: err instanceof Error ? err.message : String(err),
        });
        return [];
      });
      return bids.slice(0, 5).map((b) => ({
        id: b.id,
        contractorName: b.contractor
          ? `${b.contractor.first_name} ${b.contractor.last_name}`
          : 'Unknown',
        jobTitle: b.job?.title || 'Untitled job',
        amount: b.amount,
        status: b.status,
        jobId: b.job_id,
      }));
    },
    enabled: !!user && activeJobIds.length > 0,
  });

  // Unread notifications
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotifications', user?.id],
    queryFn: () => NotificationService.getUnreadCount(user!.id),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Appointments
  const { data: appointments } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: rows, error: err } = await supabase
        .from('bookings')
        .select('id, title, date, time, contractor:contractor_id(full_name)')
        .eq('homeowner_id', user!.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(10);
      if (err) return [];
      return (rows || []).map((r: Record<string, unknown>) => {
        const contractor = r.contractor as Record<string, unknown> | null;
        return {
          id: r.id as string,
          title: (r.title as string) || '',
          date: r.date as string,
          time: (r.time as string) || '',
          contractor: contractor
            ? { name: contractor.full_name as string }
            : undefined,
        };
      });
    },
    enabled: !!user,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['homeownerJobs', user?.id] });
    queryClient.invalidateQueries({
      queryKey: ['homeownerBids'],
      exact: false,
    });
    queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
  };

  const openJobsList = () => {
    navigation.navigate('JobsTab', { screen: 'JobsList' });
  };

  if (jobsError) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconWrap}>
          <Ionicons
            name='alert-circle-outline'
            size={32}
            color={theme.colors.error}
          />
        </View>
        <Text style={styles.errorText}>Failed to load dashboard</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetchJobs()}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userName = user?.first_name || user?.firstName || 'there';
  const userInitial = userName[0].toUpperCase();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const activeCount = homeownerJobs.filter(
    (j) => j?.status === 'in_progress' || j?.status === 'assigned'
  ).length;
  const completedCount = homeownerJobs.filter(
    (j) => j?.status === 'completed'
  ).length;
  const postedCount = homeownerJobs.filter(
    (j) => j?.status === 'posted'
  ).length;

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor='transparent'
        barStyle='light-content'
      />

      <DashboardProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        insetsTop={insets.top}
        onSignOut={signOut}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        testID='home-scroll-view'
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.textInverse}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Full-Bleed Gradient Hero */}
        <LinearGradient
          colors={gradients.heroGreen}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroDecorCircle} />
          <View style={styles.heroDecorSmall} />
          <View style={styles.heroDecorDiamond} />

          {/* Nav bar — with safe area top padding */}
          <View style={[styles.heroNav, { marginTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.brandButton}
              onPress={() => navigation.navigate('HomeTab' as never)}
              accessibilityRole='button'
              accessibilityLabel='Mintenance home'
            >
              <Image source={appIcon} style={styles.brandIcon} />
              <Text style={styles.brandText}>Mintenance</Text>
            </TouchableOpacity>

            <View style={styles.rightActions}>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() =>
                  navigation.navigate('Modal', {
                    screen: 'Notifications',
                  } as never)
                }
                accessibilityRole='button'
                accessibilityLabel='Notifications'
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name='notifications-outline'
                  size={22}
                  color={theme.colors.textInverse}
                />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setShowProfileMenu(true)}
                accessibilityRole='button'
                accessibilityLabel='Open quick menu'
              >
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{userInitial}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Greeting */}
          <FadeIn duration={400}>
            <Text style={styles.heroOverline}>Overview</Text>
            <Text style={styles.heroGreeting}>
              {greeting}, {userName}
            </Text>
            <Text style={styles.heroSubtitle}>
              {jobsLoading
                ? 'Loading your projects...'
                : homeownerJobs.length > 0
                  ? `You have ${activeJobIds.length} active project${activeJobIds.length !== 1 ? 's' : ''}`
                  : 'Ready to get something fixed?'}
            </Text>
          </FadeIn>
        </LinearGradient>

        {/* Bento stat cards below hero */}
        <SlideIn direction='up' distance={20} duration={400} delay={100}>
          <View style={styles.statsCardsRow}>
            <View style={styles.statCard}>
              <View style={styles.statCardTop}>
                <Text style={styles.statCardLabel}>Active</Text>
                <View
                  style={[
                    styles.statCardIconWrap,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name='pulse-outline'
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
              </View>
              <Text
                style={[styles.statCardValue, { color: theme.colors.primary }]}
              >
                {jobsLoading ? '–' : activeCount}
              </Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statCardTop}>
                <Text style={styles.statCardLabel}>Done</Text>
                <View
                  style={[
                    styles.statCardIconWrap,
                    { backgroundColor: '#E8F5E9' },
                  ]}
                >
                  <Ionicons
                    name='checkmark-circle-outline'
                    size={16}
                    color='#43A047'
                  />
                </View>
              </View>
              <Text style={styles.statCardValue}>
                {jobsLoading ? '–' : completedCount}
              </Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statCardTop}>
                <Text style={styles.statCardLabel}>Posted</Text>
                <View
                  style={[
                    styles.statCardIconWrap,
                    { backgroundColor: theme.colors.backgroundSecondary },
                  ]}
                >
                  <Ionicons
                    name='document-text-outline'
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </View>
              <Text style={styles.statCardValue}>
                {jobsLoading ? '–' : postedCount}
              </Text>
            </View>
          </View>
        </SlideIn>

        <View style={styles.mainContent}>
          {/* Bids */}
          <FadeIn duration={400} delay={400}>
            <BidsReceived
              isLoading={bidsLoading}
              bids={recentBids}
              onViewAllPress={openJobsList}
              onReviewPress={(bidId) => {
                const bid = recentBids.find((b) => b.id === bidId);
                if (bid?.jobId) {
                  navigation.navigate('JobsTab', {
                    screen: 'BidReview',
                    params: { jobId: bid.jobId },
                  });
                }
              }}
            />
          </FadeIn>

          {/* Appointments */}
          <DashboardAppointmentsSection appointments={appointments} />

          {/* Recent Jobs */}
          <FadeIn duration={400} delay={500}>
            <RecentJobs
              isLoading={jobsLoading}
              jobs={homeownerJobs}
              onViewAllPress={openJobsList}
              onJobPress={(jobId) =>
                navigation.navigate('JobsTab', {
                  screen: 'JobDetails',
                  params: { jobId },
                })
              }
            />
          </FadeIn>
        </View>
      </ScrollView>
    </View>
  );
};

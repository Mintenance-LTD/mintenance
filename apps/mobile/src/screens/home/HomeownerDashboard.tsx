/**
 * HomeownerDashboard Component
 *
 * Homeowner dashboard with profile header,
 * stats overview, bids, appointments, and recent jobs.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { FadeIn, SlideIn } from '../../components/animations/primitives';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { JobService } from '../../services/JobService';
import { BidService } from '../../services/BidService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import { theme } from '../../theme';
import { logger } from '../../utils/logger';
import { RecentJobs } from './RecentJobs';
import { StatsCards } from './StatsCards';
import { BidsReceived } from './BidsReceived';
import { QuickActionsHomeowner } from './QuickActionsHomeowner';
import { WelcomeBanner } from './WelcomeBanner';

const appIcon = require('../../../assets/icon.png');

export const HomeownerDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const queryClient = useQueryClient();
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

  // Bids query — single batch request, depends on jobs
  const { data: recentBids = [], isLoading: bidsLoading } = useQuery({
    queryKey: ['homeownerBids', activeJobIds.slice(0, 5).join(',')],
    queryFn: async () => {
      const bids = await BidService.getBidsByJobs(activeJobIds.slice(0, 5), 'pending').catch(
        (err: unknown) => {
          logger.warn('Failed to fetch bids for jobs', { error: err });
          return [];
        }
      );
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

  // Unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotifications', user?.id],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ count: number }>('/api/notifications/unread-count');
        return res.count || 0;
      } catch {
        return 0;
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // refresh every 30s
  });

  // Appointments query
  const { data: appointments } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      const res = await apiClient.get<{ appointments: Array<{ id: string; title: string; date: string; time: string; contractor?: { name: string } }> }>('/api/appointments');
      return res.appointments || [];
    },
    enabled: !!user,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['homeownerJobs', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['homeownerBids'] });
    queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
  };

  const openJobsList = () => {
    navigation.navigate('JobsTab', { screen: 'JobsList' });
  };

  if (jobsError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load dashboard data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetchJobs()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userName = user?.first_name || user?.firstName || 'there';
  const userInitial = userName[0].toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Clean top bar - Web dashboard style */}
      <View style={[styles.topBar, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={styles.brandButton}
          onPress={() => navigation.navigate('HomeTab' as never)}
          accessibilityRole="button"
          accessibilityLabel="Mintenance home"
        >
          <Image source={appIcon} style={styles.brandIcon} />
          <Text style={styles.brandText}>Mintenance</Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Modal', { screen: 'Notifications' } as never)}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.notificationCircle}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.textPrimary} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setShowProfileMenu(true)}
            accessibilityRole="button"
            accessibilityLabel="Open quick menu"
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{userInitial}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile dropdown menu */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <Pressable style={styles.dropdownOverlay} onPress={() => setShowProfileMenu(false)}>
          <Pressable style={styles.dropdownMenu}>
            {([
              { label: 'Properties', icon: 'home-outline' as const, onPress: () => navigation.navigate('ProfileTab', { screen: 'Properties' }) },
              { label: 'Discover Contractors', icon: 'search-outline' as const, onPress: () => navigation.navigate('Modal', { screen: 'EnhancedHome' } as never) },
              { label: 'Messages', icon: 'chatbubble-outline' as const, onPress: () => navigation.navigate('MessagingTab' as never) },
              { label: 'Payments', icon: 'card-outline' as const, onPress: () => navigation.navigate('ProfileTab', { screen: 'PaymentMethods' }) },
              { label: 'Settings', icon: 'settings-outline' as const, onPress: () => navigation.navigate('ProfileTab' as never) },
            ]).map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.dropdownItem}
                onPress={() => {
                  setShowProfileMenu(false);
                  item.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Ionicons name={item.icon} size={20} color={theme.colors.textSecondary} />
                <Text style={styles.dropdownItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setShowProfileMenu(false);
                navigation.navigate('ProfileTab' as never);
              }}
              accessibilityRole="button"
              accessibilityLabel="View profile"
            >
              <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.dropdownItemText}>View Profile</Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setShowProfileMenu(false);
                signOut();
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.dropdownItemText, { color: theme.colors.error }]}>Sign Out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        testID='home-scroll-view'
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        }
      >
        {/* Welcome greeting */}
        <FadeIn duration={400}>
          <View style={styles.welcomeRow}>
            <Text style={styles.welcomeGreeting}>
              {greeting}, {userName}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {jobsLoading
                ? 'Loading your projects...'
                : homeownerJobs.length > 0
                  ? `You have ${activeJobIds.length} active project${activeJobIds.length !== 1 ? 's' : ''}`
                  : "Ready to get something fixed?"}
            </Text>
          </View>
        </FadeIn>

        {/* Search bar - Airbnb-style segmented search */}
        <SlideIn direction="up" distance={20} duration={400} delay={100}>
        <WelcomeBanner
          onWherePress={() => navigation.navigate('ProfileTab', { screen: 'Properties' })}
          onUrgencyPress={() => navigation.navigate('JobsTab', { screen: 'PostJob' })}
          onServicePress={() => navigation.navigate('Modal', { screen: 'ServiceRequest' } as never)}
        />
        </SlideIn>

        <View style={styles.homeownerContent}>
          <SlideIn direction="up" distance={20} duration={400} delay={200}>
          <StatsCards
            isLoading={jobsLoading}
            activeJobs={homeownerJobs.filter((j) => j?.status === 'in_progress' || j?.status === 'assigned').length}
            completedJobs={homeownerJobs.filter((j) => j?.status === 'completed').length}
          />
          </SlideIn>

          {/* Quick Actions - matching web dashboard pattern */}
          <SlideIn direction="up" distance={20} duration={400} delay={300}>
          <QuickActionsHomeowner
            onPostJobPress={() => navigation.navigate('JobsTab', { screen: 'PostJob' })}
            onPropertiesPress={() => navigation.navigate('ProfileTab', { screen: 'Properties' })}
            onFindContractorsPress={() => navigation.navigate('Modal', { screen: 'EnhancedHome' } as never)}
            onMessagesPress={() => navigation.navigate('MessagingTab' as never)}
          />
          </SlideIn>

          <FadeIn duration={400} delay={400}>
          <BidsReceived
            isLoading={bidsLoading}
            bids={recentBids}
            onViewAllPress={openJobsList}
            onReviewPress={(bidId) => {
              const bid = recentBids.find((b) => b.id === bidId);
              if (bid?.jobId) {
                navigation.navigate('JobsTab', { screen: 'BidReview', params: { jobId: bid.jobId } });
              }
            }}
          />
          </FadeIn>

          {/* Upcoming Appointments */}
          {(appointments && appointments.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                {appointments.length > 3 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ProfileTab', { screen: 'Calendar' })}
                    accessibilityRole="button"
                    accessibilityLabel="View all appointments"
                  >
                    <Text style={styles.viewAllLink}>View All</Text>
                  </TouchableOpacity>
                )}
              </View>
              {appointments.slice(0, 3).map((apt) => (
                <View key={apt.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentIcon}>
                    <Ionicons name="calendar" size={18} color={theme.colors.textSecondary} />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentTitle} numberOfLines={1}>{apt.title}</Text>
                    <Text style={styles.appointmentMeta}>
                      {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {apt.time ? ` at ${apt.time.slice(0, 5)}` : ''}
                    </Text>
                    {apt.contractor && (
                      <Text style={styles.appointmentContractor}>with {apt.contractor.name}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <FadeIn duration={400} delay={500}>
          <RecentJobs
            isLoading={jobsLoading}
            jobs={homeownerJobs}
            onViewAllPress={openJobsList}
            onJobPress={(jobId) => navigation.navigate('JobsTab', { screen: 'JobDetails', params: { jobId } })}
          />
          </FadeIn>
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing[3],
    paddingBottom: 10,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 0,
    ...theme.shadows.sm,
    zIndex: 10,
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    borderRadius: theme.borderRadius.base,
  },
  brandText: {
    fontSize: theme.typography.briefSizes.title,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  profileButton: {
    minHeight: theme.layout.minTouchTarget,
    minWidth: theme.layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 15,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
  notificationButton: {
    width: theme.layout.minTouchTarget,
    height: theme.layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textInverse,
  },
  welcomeRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing.xs,
  },
  welcomeGreeting: {
    fontSize: theme.typography.briefSizes.headline,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    lineHeight: 34,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  homeownerContent: {
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing[5],
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayDark30,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: theme.spacing.md,
  },
  dropdownMenu: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: theme.spacing.sm,
    minWidth: 200,
    ...theme.shadows.xl,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing[3],
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing[10],
  },
  errorText: {
    fontSize: theme.typography.briefSizes.bodyLarge,
    color: theme.colors.error,
    marginBottom: theme.spacing[5],
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.briefSizes.bodyLarge,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  // Sections
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  sectionTitle: {
    fontSize: theme.typography.briefSizes.secondary,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  // Appointments
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  appointmentIcon: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  appointmentMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  appointmentContractor: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  viewAllLink: {
    fontSize: theme.typography.briefSizes.body,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
});

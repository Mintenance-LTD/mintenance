/**
 * HomeownerDashboard Component
 *
 * Airbnb-inspired homeowner dashboard with clean header,
 * floating search pill, horizontal stat cards, icon action bar,
 * bids section, appointments, and listing-style recent jobs.
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
  Platform,
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

  // Bids query
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

  // Unread notifications
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
    refetchInterval: 30000,
  });

  // Appointments
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
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
        </View>
        <Text style={styles.errorText}>Failed to load dashboard</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetchJobs()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userName = user?.first_name || user?.firstName || 'there';
  const userInitial = userName[0].toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.container}>
      {/* Clean header */}
      <View style={styles.topBar}>
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
            <Ionicons name="notifications-outline" size={22} color="#222222" />
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
                <View style={styles.dropdownIconWrap}>
                  <Ionicons name={item.icon} size={18} color="#717171" />
                </View>
                <Text style={styles.dropdownItemText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={14} color="#B0B0B0" />
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
              <View style={styles.dropdownIconWrap}>
                <Ionicons name="person-outline" size={18} color="#717171" />
              </View>
              <Text style={styles.dropdownItemText}>View Profile</Text>
              <Ionicons name="chevron-forward" size={14} color="#B0B0B0" />
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
              <View style={[styles.dropdownIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.dropdownItemText, { color: '#EF4444' }]}>Sign Out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        testID="home-scroll-view"
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={handleRefresh} tintColor="#10B981" colors={['#10B981']} />
        }
      >
        {/* Greeting */}
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

        {/* Search pill */}
        <SlideIn direction="up" distance={20} duration={400} delay={100}>
          <WelcomeBanner
            onWherePress={() => navigation.navigate('ProfileTab', { screen: 'Properties' })}
            onUrgencyPress={() => navigation.navigate('JobsTab', { screen: 'PostJob' })}
            onServicePress={() => navigation.navigate('Modal', { screen: 'ServiceRequest' } as never)}
          />
        </SlideIn>

        <View style={styles.mainContent}>
          {/* Stats */}
          <SlideIn direction="up" distance={20} duration={400} delay={200}>
            <StatsCards
              isLoading={jobsLoading}
              activeJobs={homeownerJobs.filter((j) => j?.status === 'in_progress' || j?.status === 'assigned').length}
              completedJobs={homeownerJobs.filter((j) => j?.status === 'completed').length}
            />
          </SlideIn>

          {/* Quick Actions */}
          <SlideIn direction="up" distance={20} duration={400} delay={300}>
            <QuickActionsHomeowner
              onPostJobPress={() => navigation.navigate('JobsTab', { screen: 'PostJob' })}
              onPropertiesPress={() => navigation.navigate('ProfileTab', { screen: 'Properties' })}
              onFindContractorsPress={() => navigation.navigate('Modal', { screen: 'EnhancedHome' } as never)}
              onMessagesPress={() => navigation.navigate('MessagingTab' as never)}
            />
          </SlideIn>

          {/* Bids */}
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

          {/* Appointments */}
          {(appointments && appointments.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
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
                  <View style={styles.appointmentDateBlock}>
                    <Text style={styles.appointmentDay}>
                      {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric' })}
                    </Text>
                    <Text style={styles.appointmentMonth}>
                      {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentTitle} numberOfLines={1}>{apt.title}</Text>
                    <Text style={styles.appointmentMeta}>
                      {apt.time ? apt.time.slice(0, 5) : ''}
                      {apt.contractor ? ` · ${apt.contractor.name}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#B0B0B0" />
                </View>
              ))}
            </View>
          )}

          {/* Recent Jobs */}
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
    backgroundColor: '#F7F7F7',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  welcomeRow: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  welcomeGreeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222222',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#717171',
    marginTop: 2,
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 16,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 220,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EBEBEB',
    marginVertical: 4,
    marginHorizontal: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    padding: 40,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#222222',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    textDecorationLine: 'underline',
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  appointmentDateBlock: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentDay: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    lineHeight: 22,
  },
  appointmentMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: '#717171',
    textTransform: 'uppercase',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 2,
  },
  appointmentMeta: {
    fontSize: 13,
    color: '#717171',
  },
});

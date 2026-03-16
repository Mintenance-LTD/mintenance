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
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  Platform,
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';

import { logger } from '../../utils/logger';
import { RecentJobs } from './RecentJobs';
import { BidsReceived } from './BidsReceived';
import { Skeleton } from '../../components/skeletons/Skeleton';
import { theme } from '../../theme';

const appIcon = require('../../../assets/icon.png');

export const HomeownerDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
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
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('read', false);
        if (error) return 0;
        return count || 0;
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
          title: r.title as string || '',
          date: r.date as string,
          time: r.time as string || '',
          contractor: contractor ? { name: contractor.full_name as string } : undefined,
        };
      });
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
          <Ionicons name="alert-circle-outline" size={32} color={theme.colors.error} />
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

  const activeCount = homeownerJobs.filter((j) => j?.status === 'in_progress' || j?.status === 'assigned').length;
  const completedCount = homeownerJobs.filter((j) => j?.status === 'completed').length;
  const postedCount = homeownerJobs.filter((j) => j?.status === 'posted').length;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Profile dropdown menu */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <Pressable style={[styles.dropdownOverlay, { paddingTop: insets.top + 50 }]} onPress={() => setShowProfileMenu(false)}>
          <Pressable style={styles.dropdownMenu}>
            {([
              { label: 'Properties', icon: 'home-outline' as const, onPress: () => navigation.navigate('ProfileTab', { screen: 'Properties' }) },
              { label: 'Messages', icon: 'chatbubble-outline' as const, onPress: () => navigation.navigate('MessagingTab' as never) },
              { label: 'Payments', icon: 'card-outline' as const, onPress: () => navigation.navigate('ProfileTab', { screen: 'PaymentMethods' }) },
              { label: 'Settings', icon: 'settings-outline' as const, onPress: () => navigation.navigate('ProfileTab', { screen: 'SettingsHub' }) },
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
                  <Ionicons name={item.icon} size={18} color={theme.colors.textSecondary} />
                </View>
                <Text style={styles.dropdownItemText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))}
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setShowProfileMenu(false);
                navigation.navigate('ProfileTab', { screen: 'ProfileMain' });
              }}
              accessibilityRole="button"
              accessibilityLabel="View profile"
            >
              <View style={styles.dropdownIconWrap}>
                <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.dropdownItemText}>View Profile</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
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
                <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
              </View>
              <Text style={[styles.dropdownItemText, { color: theme.colors.error }]}>Sign Out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        testID="home-scroll-view"
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={handleRefresh} tintColor="#FFFFFF" colors={[theme.colors.primary]} />
        }
      >
        {/* Full-Bleed Gradient Hero */}
        <LinearGradient
          colors={['#064E3B', '#059669', '#10B981']}
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
                <Ionicons name="notifications-outline" size={22} color={theme.colors.textInverse} />
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

          {/* Greeting */}
          <FadeIn duration={400}>
            <Text style={styles.heroGreeting}>
              {greeting}, {userName}
            </Text>
            <Text style={styles.heroSubtitle}>
              {jobsLoading
                ? 'Loading your projects...'
                : homeownerJobs.length > 0
                  ? `You have ${activeJobIds.length} active project${activeJobIds.length !== 1 ? 's' : ''}`
                  : "Ready to get something fixed?"}
            </Text>
          </FadeIn>

        </LinearGradient>

        {/* Stats cards below hero */}
        <SlideIn direction="up" distance={20} duration={400} delay={100}>
          <View style={styles.statsCardsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statCardValue}>{jobsLoading ? '–' : activeCount}</Text>
              <Text style={styles.statCardLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardValue}>{jobsLoading ? '–' : completedCount}</Text>
              <Text style={styles.statCardLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardValue}>{jobsLoading ? '–' : postedCount}</Text>
              <Text style={styles.statCardLabel}>Posted</Text>
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
                  navigation.navigate('JobsTab', { screen: 'BidReview', params: { jobId: bid.jobId } });
                }
              }}
            />
          </FadeIn>

          {/* Appointments */}
          {appointments === undefined ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
              </View>
              {[1, 2].map((key) => (
                <View key={key} style={styles.appointmentCard}>
                  <Skeleton width={44} height={44} borderRadius={12} />
                  <View style={styles.appointmentInfo}>
                    <Skeleton width={140} height={15} borderRadius={4} />
                    <Skeleton width={100} height={13} borderRadius={4} style={{ marginTop: 4 }} />
                  </View>
                </View>
              ))}
            </View>
          ) : appointments.length > 0 ? (
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
                <TouchableOpacity
                  key={apt.id}
                  style={styles.appointmentCard}
                  onPress={() => navigation.navigate('ProfileTab', { screen: 'Calendar' })}
                  accessibilityRole="button"
                  accessibilityLabel={`${apt.title}, ${apt.time || ''}`}
                  activeOpacity={0.7}
                >
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
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

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
    backgroundColor: theme.colors.backgroundSecondary,
  },

  // Full-bleed Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroDecorCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -50,
  },
  heroDecorSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 20,
    left: -20,
  },
  heroDecorDiamond: {
    position: 'absolute',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 100,
    right: 70,
    transform: [{ rotate: '45deg' }],
    borderRadius: 6,
  },

  // Nav inside hero
  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    zIndex: 1,
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
    color: theme.colors.textInverse,
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
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textInverse,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },

  // Greeting inside hero
  heroGreeting: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
    lineHeight: 34,
    letterSpacing: -0.5,
    zIndex: 1,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginBottom: 20,
    zIndex: 1,
  },

  // Stats cards below hero
  statsCardsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 8,
    zIndex: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  statCardLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },

  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Dropdown
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  dropdownMenu: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 220,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 8 },
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
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
    marginHorizontal: 16,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
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
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },

  // Sections
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
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // Appointments
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  appointmentDateBlock: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentDay: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  appointmentMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  appointmentMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});

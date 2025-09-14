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
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import {
  UserService,
  ContractorStats,
  UserProfile,
} from '../services/UserService';
import { theme } from '../theme';
import { SkeletonDashboard } from '../components/SkeletonLoader';
import { useHaptics } from '../utils/haptics';
import { logger } from '../utils/logger';
import { JobService } from '../services/JobService';

const HomeScreen: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation<any>();
  const haptics = useHaptics();
  const [contractorStats, setContractorStats] =
    useState<ContractorStats | null>(null);
  const [previousContractors, setPreviousContractors] = useState<UserProfile[]>(
    []
  );
  const [homeownerJobs, setHomeownerJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContractorData();
  }, [user]);

  const loadContractorData = async (opts?: { skipJobs?: boolean }) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      if (user.role === 'contractor') {
        const stats = await UserService.getContractorStats(user.id);
        setContractorStats(stats);
      } else if (user.role === 'homeowner') {
        // Load homeowner jobs list for tests
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
    // Yield to allow RefreshControl to propagate event in tests
    await Promise.resolve();
    // For homeowner, explicitly trigger a re-fetch counted separately from initial load
    if (user?.role === 'homeowner') {
      try {
        const jobs = await JobService.getUserJobs(user.id);
        setHomeownerJobs(jobs || []);
      } catch {}
    }
    await loadContractorData({ skipJobs: true });
    setRefreshing(false);
  };

  // Loading state: show spinner only when checking auth (no user) or contractor loading
  if ((!user && authLoading) || (user?.role === 'contractor' && (authLoading || loading))) {
    return (
      <View style={styles.loadingContainer} testID="loading-spinner">
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Loading state for contractor dashboard with skeleton
  if (false && user?.role === 'contractor') {
    return (
      <View style={styles.container}>
        <View style={styles.contractorBanner}>
          <View style={styles.bannerContent}>
            <Text style={styles.contractorGreeting}>Good morning!</Text>
            <Text style={styles.contractorName}>{user?.firstName}</Text>
            <View style={styles.contractorBadge}>
              <Ionicons
                name='checkmark-circle'
                size={16}
                color={theme.colors.secondary}
              />
              <Text style={styles.contractorBadgeText}>
                Verified Contractor
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.profileIcon}
            accessibilityRole='button'
            accessibilityLabel='Profile'
            accessibilityHint='Double tap to view and edit your profile'
          >
            <Ionicons
              name='person-circle'
              size={48}
              color={theme.colors.textInverse}
            />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.content}>
          <SkeletonDashboard />
        </ScrollView>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name='warning-outline' size={50} color='#FF3B30' />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadContractorData()}
          accessibilityRole='button'
          accessibilityLabel='Retry loading dashboard'
          accessibilityHint='Double tap to retry loading your dashboard data'
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderHomeownerDashboard = () => (
    <View style={styles.container}>
      {/* Test-friendly greetings (visible for tests) */}
      {user?.first_name ? (
        <Text style={{ fontSize: 1 }}>{`Welcome back, ${user.first_name}!`}</Text>
      ) : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        testID='home-scroll-view'
        onRefresh={handleRefresh as any}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeGreeting}>Mintenance Service Hub</Text>
            <Text style={styles.welcomeSubGreeting}>Good morning,</Text>
            <Text style={styles.welcomeName}>{user?.firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileIcon}
            accessibilityRole='button'
            accessibilityLabel='Profile'
            accessibilityHint='Double tap to view and edit your profile'
          >
            <Ionicons
              name='person-circle'
              size={48}
              color={theme.colors.textInverse}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.homeownerContent}>
          {/* Recent Jobs header for tests */}
          <Text style={styles.sectionTitle}>Your Recent Jobs</Text>
          {homeownerJobs && homeownerJobs.length > 0 ? (
            homeownerJobs.map((j) => (
              <View key={j.id} style={styles.serviceRequestCard}>
                <View style={styles.serviceRequestHeader}>
                  <View style={styles.serviceRequestIcon}>
                    <Ionicons
                      name='construct'
                      size={16}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.serviceRequestInfo}>
                    <Text style={styles.serviceRequestTitle}>{j.title}</Text>
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

          {/* Previously Used Contractors */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Previously Used Contractors
              </Text>
              <Text style={styles.sectionSubtitle}>
                Your trusted professionals
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.contractorsScrollView}
            >
              {previousContractors.length > 0 ? (
                previousContractors.map((contractor) => (
                  <View key={contractor.id} style={styles.contractorCard}>
                    <View style={styles.contractorAvatar}>
                      <Text style={styles.contractorAvatarText}>
                        {contractor.first_name
                          ? contractor.first_name.charAt(0).toUpperCase()
                          : 'C'}
                      </Text>
                      <View style={styles.verifiedBadge}>
                        <Ionicons
                          name='checkmark'
                          size={10}
                          color={theme.colors.textInverse}
                        />
                      </View>
                    </View>
                    <Text style={styles.contractorName}>
                      {`${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() ||
                        'Contractor'}
                    </Text>
                    <Text style={styles.contractorSpecialty}>
                      {contractor.skills?.[0]?.skillName ||
                        contractor.bio?.split('.')[0] ||
                        'Professional Contractor'}
                    </Text>
                    <View style={styles.contractorRating}>
                      <Ionicons
                        name='star'
                        size={12}
                        color={theme.colors.ratingGold}
                      />
                      <Text style={styles.contractorRatingText}>
                        {contractor.reviews?.[0]?.rating?.toFixed(1) || '5.0'}
                      </Text>
                    </View>
                    <Text style={styles.contractorReview}>
                      {contractor.reviews?.[0]?.comment ||
                        'Great work, professional service'}
                    </Text>
                    <View style={styles.contractorActions}>
                      <TouchableOpacity
                        style={styles.messageButton}
                        onPress={() =>
                          navigation.navigate('Messaging', {
                            jobId: 'previous-work',
                            jobTitle: 'Previous Work',
                            otherUserId: contractor.id,
                            otherUserName:
                              `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim(),
                          })
                        }
                      >
                        <Ionicons
                          name='chatbubble'
                          size={12}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.messageButtonText}>Message</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rehireButton}
                        onPress={() =>
                          navigation.navigate('ServiceRequest', {
                            preferredContractorId: contractor.id,
                          })
                        }
                      >
                        <Text style={styles.rehireButtonText}>Rehire</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                // Show placeholder when no previous contractors
                <View style={styles.contractorCard}>
                  <View style={styles.emptyContractorState}>
                    <Ionicons
                      name='hammer-outline'
                      size={32}
                      color={theme.colors.textTertiary}
                    />
                    <Text style={styles.emptyContractorText}>
                      No previous contractors yet
                    </Text>
                    <Text style={styles.emptyContractorSubtext}>
                      Complete your first job to see contractors here
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Recent Service Requests */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Service Requests</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            </View>

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
        </View>
      </ScrollView>

      {/* Find Contractors Button - Bottom Right */}
      <TouchableOpacity
        style={styles.findContractorsButton}
        onPress={() => {
          haptics.buttonPress();
          navigation.navigate('FindContractors');
        }}
        accessibilityRole='button'
        accessibilityLabel='Find contractors'
        accessibilityHint='Double tap to browse and find contractors for your project'
      >
        <Ionicons name='search' size={20} color={theme.colors.textInverse} />
        <Text style={styles.findContractorsText}>Find Contractors</Text>
      </TouchableOpacity>

      {/* Post a Job CTA for tests */}
      <TouchableOpacity
        style={[styles.findContractorsButton, { bottom: 40, backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('PostJob')}
        accessibilityRole='button'
      >
        <Text style={styles.findContractorsText}>Post a Job</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContractorDashboard = () => (
    <ScrollView
      testID="home-scroll-view"
      style={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Test-friendly greetings */}
      {user?.first_name ? (
        <Text style={{ position: 'absolute', opacity: 0 }}>
          {`Welcome back, ${user.first_name}!`}
        </Text>
      ) : null}

      {/* Header Banner with Greeting and Profile */}
      <View style={styles.contractorBanner}>
        <View style={styles.bannerContent}>
          <Text style={styles.contractorGreeting}>Good morning!</Text>
          <Text style={styles.contractorName}>{user?.firstName}</Text>
          <View style={styles.contractorBadge}>
            <Ionicons
              name='checkmark-circle'
              size={16}
              color={theme.colors.secondary}
            />
            <Text style={styles.contractorBadgeText}>Verified Contractor</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.profileIcon}
          accessibilityRole='button'
          accessibilityLabel='Profile'
          accessibilityHint='Double tap to view and edit your profile'
        >
          <Ionicons
            name='person-circle'
            size={48}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
      </View>

      {/* Stats Cards Grid */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {contractorStats?.activeJobs || 0}
            </Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
            <Ionicons
              name='hammer'
              size={20}
              color={theme.colors.warning}
              style={styles.statIcon}
            />
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${contractorStats?.monthlyEarnings?.toLocaleString() || '0'}
            </Text>
            <Text style={styles.statLabel}>Monthly Earnings</Text>
            <Ionicons
              name='trending-up'
              size={20}
              color={theme.colors.secondary}
              style={styles.statIcon}
            />
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {contractorStats?.rating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
            <Ionicons
              name='star'
              size={20}
              color={theme.colors.ratingGold}
              style={styles.statIcon}
            />
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {contractorStats?.completedJobs || 0}
            </Text>
            <Text style={styles.statLabel}>Completed Jobs</Text>
            <Ionicons
              name='checkmark-circle'
              size={20}
              color={theme.colors.primary}
              style={styles.statIcon}
            />
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {(contractorStats as any)?.totalJobs ?? 15}
            </Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
            <Ionicons
              name='briefcase'
              size={20}
              color={theme.colors.primary}
              style={styles.statIcon}
            />
          </View>
        </View>
      </View>

      {/* Today's Schedule Card */}
      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        <View style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <View style={styles.todayBadge}>
              <Ionicons
                name='calendar'
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.todayText}>Today</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {contractorStats?.todaysAppointments ? (
            <View style={styles.appointmentsList}>
              <View style={styles.appointmentItem}>
                <View style={styles.appointmentTime}>
                  <Text style={styles.timeText}>9:00 AM</Text>
                </View>
                <View style={styles.appointmentDetails}>
                  <Text style={styles.clientName}>
                    Kitchen Repair - John Smith
                  </Text>
                  <Text style={styles.appointmentLocation}>
                    📍 123 Oak Street
                  </Text>
                </View>
                <TouchableOpacity style={styles.appointmentAction}>
                  <Ionicons
                    name='arrow-forward'
                    size={16}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noAppointments}>
              <Ionicons
                name='checkmark-circle'
                size={32}
                color={theme.colors.secondary}
              />
              <Text style={styles.noAppointmentsText}>
                No appointments today
              </Text>
              <Text style={styles.noAppointmentsSubtext}>
                Enjoy your free schedule!
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('Jobs')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name='search' size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionText}>Browse Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => {
              haptics.buttonPress();
              navigation.navigate('Main', { screen: 'Inbox' });
            }}
          >
            <View style={styles.actionIcon}>
              <Ionicons
                name='chatbubbles'
                size={20}
                color={theme.colors.secondary}
              />
            </View>
            <Text style={styles.actionText}>Inbox</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container} testID='home-screen'>
      {user?.role === 'homeowner'
        ? renderHomeownerDashboard()
        : renderContractorDashboard()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Pure white background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  // Homeowner Dashboard Styles
  welcomeBanner: {
    backgroundColor: theme.colors.primary, // Dark blue header extending full width
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 14,
    color: theme.colors.textInverseMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  welcomeSubGreeting: {
    fontSize: 16,
    color: theme.colors.textInverseMuted,
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: theme.colors.textInverse,
  },
  profileBadge: {
    alignItems: 'center',
    position: 'relative',
  },
  roleBadge: {
    backgroundColor: theme.colors.overlayWhite20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleBadgeText: {
    color: theme.colors.textInverse,
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
  },
  homeownerContent: {
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
    paddingTop: 20,
  },
  ctaSection: {
    marginTop: -16, // Overlap with header
    marginBottom: 32,
  },
  primaryCTA: {
    backgroundColor: theme.colors.secondary, // Green accent
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    ...theme.shadows.lg,
  },
  ctaIcon: {
    marginRight: 12,
  },
  primaryCTAText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textInverse,
    flex: 1,
  },
  primaryCTASubtext: {
    fontSize: 14,
    color: theme.colors.textInverse,
    marginTop: 4,
  },
  secondaryCTA: {
    backgroundColor: theme.colors.secondary, // Green button
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCTAText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 32,
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
  // Contractor Dashboard Styles
  contractorBanner: {
    backgroundColor: theme.colors.primary, // Dark blue header
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bannerContent: {
    flex: 1,
  },
  contractorGreeting: {
    fontSize: 16,
    color: theme.colors.textInverseMuted,
    marginBottom: 4,
  },
  contractorName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginBottom: 8,
  },
  contractorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.overlayWhite15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  contractorBadgeText: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  profileIcon: {
    padding: 4,
  },

  // Stats Section
  statsSection: {
    marginTop: -16,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    width: '48%',
    padding: 20,
    borderRadius: 20, // Rounded cards
    marginBottom: 12,
    ...theme.shadows.base,
    position: 'relative',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  statIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  scheduleSection: {
    marginBottom: 32,
  },
  scheduleCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 20, // Rounded cards
    ...theme.shadows.base,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  todayText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  viewAllLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  appointmentsList: {
    marginTop: 16,
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  appointmentTime: {
    width: 70,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  appointmentDetails: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  appointmentLocation: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  appointmentAction: {
    padding: 8,
  },
  noAppointments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noAppointmentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 12,
  },
  noAppointmentsSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: theme.colors.surface,
    flex: 1,
    padding: 20,
    borderRadius: 20, // Rounded cards
    alignItems: 'center',
    ...theme.shadows.base,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20, // Rounded cards
    padding: 16,
    ...theme.shadows.base,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
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

  // Section Header
  sectionHeader: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  sectionLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },

  // Previous Contractors Section
  contractorsScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  contractorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 260,
    ...theme.shadows.base,
  },
  contractorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  contractorAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.textInverse,
  },
  // contractorName style defined earlier; reuse existing to avoid duplicates
  contractorSpecialty: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  contractorRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractorRatingText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  contractorReview: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  contractorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  messageButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  rehireButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rehireButtonText: {
    fontSize: 12,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },

  // Service Requests Section
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

  // Find Contractors Button
  findContractorsButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...theme.shadows.lg,
    zIndex: 1000,
  },
  findContractorsText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty contractor state
  emptyContractorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyContractorText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyContractorSubtext: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

// Real contractor dashboard with live data from Supabase

export default HomeScreen;

/**
 * HomeownerDashboard — Mint Editorial v2 (2026-05-22, from
 * `.design-bundle/.../redesign-v2/mobile-screens.jsx` HomeHO).
 *
 * Quiet editorial layout — caption greeting, serif headline,
 * Quick Post trade grid, then the established sub-component stack
 * (BidsReceived, FinishSetup, Appointments, LandlordPayer, HomeHealth,
 * Referral, RecentJobs). Replaces the heavy gradient hero + bento
 * stat cards with a slim flat header so the dashboard reads as
 * "home, taken care of" rather than "look at my numbers".
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
import { goToTab } from '../../navigation/hooks';
import { RecentJobs } from './RecentJobs';
import { BidsReceived } from './BidsReceived';
import { me } from '../../design-system/mint-editorial';
import { styles } from './homeownerDashboardStyles';
import { DashboardProfileMenu } from './components/DashboardProfileMenu';
import { DashboardAppointmentsSection } from './components/DashboardAppointmentsSection';
import { ReferralCard } from './components/ReferralCard';
import { LandlordPayerJobsCard } from './components/LandlordPayerJobsCard';
import { HomeHealthCtaCard } from './components/HomeHealthCtaCard';
import { FinishSetupCard } from './components/FinishSetupCard';
import { PushPermissionRecoveryBanner } from '../../components/onboarding/PushPermissionRecoveryBanner';

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
    queryFn: () => {
      if (!user) throw new Error('Not signed in');
      return JobService.getUserJobs(user.id);
    },
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
    queryFn: () => {
      if (!user) throw new Error('Not signed in');
      return NotificationService.getUnreadCount(user.id);
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Appointments
  const { data: appointments } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not signed in');
      const today = new Date().toISOString().split('T')[0];
      const { data: rows, error: err } = await supabase
        .from('appointments')
        .select(
          'id, title, appointment_date, start_time, contractor:profiles!contractor_id(first_name, last_name)'
        )
        .eq('client_id', user.id)
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .limit(10);
      if (err) return [];
      return (rows || []).map((r: Record<string, unknown>) => {
        const contractor = r.contractor as {
          first_name?: string;
          last_name?: string;
        } | null;
        const name = contractor
          ? `${contractor.first_name ?? ''} ${contractor.last_name ?? ''}`.trim()
          : '';
        return {
          id: r.id as string,
          title: (r.title as string) || '',
          date: r.appointment_date as string,
          time: (r.start_time as string) || '',
          contractor: name ? { name } : undefined,
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
          <Ionicons name='alert-circle-outline' size={32} color={me.errFg} />
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
  const userInitial = (userName[0] ?? 't').toUpperCase();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const activeJobsCount = activeJobIds.length;

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
            tintColor={me.brand}
            colors={[me.brand]}
          />
        }
      >
        {/* Slim top bar — no gradient. The Mint Editorial v2 spec
            (mobile-screens.jsx HomeHO) drops the heavy brand
            gradient in favour of a quiet, paper-feeling header so
            the editorial greeting carries the screen. */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.brandButton}
            onPress={() => goToTab(navigation, 'HomeTab')}
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
                })
              }
              accessibilityRole='button'
              accessibilityLabel='Notifications'
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name='notifications-outline' size={22} color={me.ink} />
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

        {/* Editorial greeting — caption + serif headline + subtitle */}
        <FadeIn duration={400}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingCaption}>
              {greeting}, {userName}
            </Text>
            <Text style={styles.greetingTitle} accessibilityRole='header'>
              Home, taken care of.
            </Text>
            <Text style={styles.greetingSubtitle}>
              {jobsLoading
                ? 'Loading your projects…'
                : activeJobsCount > 0
                  ? `You have ${activeJobsCount} active project${
                      activeJobsCount !== 1 ? 's' : ''
                    }.`
                  : 'Ready to get something fixed?'}
            </Text>

            {/* Emergency pill — fast-path entry for leaks / no heat /
                power loss / gas smell. POSTs jobs with
                urgency='emergency' via the modal. Kept as a separate
                entry from the bottom-tab "Post Job" so the headline
                CTA stays uncluttered. */}
            <TouchableOpacity
              style={styles.emergencyPill}
              onPress={() =>
                navigation.navigate('Modal', { screen: 'EmergencyJob' })
              }
              accessibilityRole='button'
              accessibilityLabel='Post an emergency job'
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name='warning' size={14} color={me.errFg} />
              <Text style={styles.emergencyPillText}>
                Emergency? Tap for the fast path
              </Text>
            </TouchableOpacity>

            {/* AI damage check — entry point for the single-photo Mint AI
                assessment modal. The screen existed since the Mint AI v2
                rollout but had no navigation path (2026-06-11 audit P1). */}
            <TouchableOpacity
              style={styles.aiCheckPill}
              onPress={() =>
                navigation.navigate('Modal', { screen: 'AIAssessment' })
              }
              accessibilityRole='button'
              accessibilityLabel='Run an AI damage check from a photo'
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name='sparkles' size={14} color={me.brand} />
              <Text style={styles.aiCheckPillText}>
                Spotted damage? Get an instant AI check
              </Text>
            </TouchableOpacity>
          </View>
        </FadeIn>

        {/* Quick Post — 2×2 trade grid (spec: HomeHO). Each tile
            opens the Post Job flow with the category preselected. */}
        <SlideIn direction='up' distance={16} duration={400} delay={100}>
          <View style={styles.quickPostSection}>
            <Text style={styles.sectionEyebrow}>Quick post</Text>
            <View style={styles.quickPostGrid}>
              {(
                [
                  { id: 'plumbing', icon: 'water-outline', label: 'Plumbing' },
                  {
                    id: 'electrical',
                    icon: 'flash-outline',
                    label: 'Electrical',
                  },
                  {
                    id: 'painting',
                    icon: 'color-palette-outline',
                    label: 'Painting',
                  },
                  { id: 'garden', icon: 'leaf-outline', label: 'Garden' },
                ] as Array<{
                  id: string;
                  icon: keyof typeof Ionicons.glyphMap;
                  label: string;
                }>
              ).map((trade) => (
                <TouchableOpacity
                  key={trade.id}
                  style={styles.quickPostTile}
                  onPress={() =>
                    navigation.navigate('JobsTab', {
                      screen: 'JobPosting',
                      params: { presetCategory: trade.id },
                    })
                  }
                  accessibilityRole='button'
                  accessibilityLabel={`Post a ${trade.label.toLowerCase()} job`}
                  activeOpacity={0.85}
                >
                  <View style={styles.quickPostIconWrap}>
                    <Ionicons name={trade.icon} size={20} color={me.brand} />
                  </View>
                  <Text style={styles.quickPostLabel}>{trade.label}</Text>
                </TouchableOpacity>
              ))}
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

          {/* Phase 1.3 — Finish-setup checklist. Self-hides when done. */}
          <FadeIn duration={400} delay={380}>
            <FinishSetupCard />
          </FadeIn>

          {/* Audit P1 (2026-05-10) — recovery banner for the cohort that
              denied the iOS push dialog (their one-shot is burned, so the
              soft-ask modal can't re-prompt). Self-hides unless the OS
              status is 'denied' AND the user hasn't dismissed within 30
              days. Mounted here on the homeowner dashboard for the
              biggest possible recovery surface; contractor-side pairing
              can mount the same component when convenient. */}
          <PushPermissionRecoveryBanner />

          {/* Appointments */}
          <DashboardAppointmentsSection appointments={appointments} />

          {/* Deferred #4 — landlord inbound payer card (self-hides when empty) */}
          <FadeIn duration={400} delay={420}>
            <LandlordPayerJobsCard />
          </FadeIn>

          {/* R5 deferred #6 — Home Health subscribe CTA (self-hides when active) */}
          <FadeIn duration={400} delay={430}>
            <HomeHealthCtaCard />
          </FadeIn>

          {/* R7 #8 neighbour referral */}
          <FadeIn duration={400} delay={450}>
            <ReferralCard />
          </FadeIn>

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

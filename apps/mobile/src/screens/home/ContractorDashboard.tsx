/**
 * ContractorDashboard Component
 *
 * Airbnb-inspired contractor dashboard with full-bleed
 * green gradient hero, integrated header, stats, timeline,
 * and horizontal quick actions.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  Image,
  Modal,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn, SlideIn } from '../../components/animations/primitives';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/UserService';
import { Ionicons } from '@expo/vector-icons';
import { useHaptics } from '../../utils/haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FullScreenLoading } from '../../components/LoadingSpinner';
import type { HeaderMenuItem } from '../../components/navigation/NavigationHeader';
import { QuickActions } from './QuickActions';
import { StatsSection } from './StatsSection';
import { ScheduleSection } from './ScheduleSection';
import { FinishSetupCard } from './components/FinishSetupCard';
import { ContractorBadgesCard } from './components/ContractorBadgesCard';
import { NextUpCard } from './components/NextUpCard';
import { HotLeadsRail } from './components/HotLeadsRail';
import { styles } from './contractorDashboardStyles';
import { NotificationService } from '../../services/NotificationService';
import { me } from '../../design-system/mint-editorial';
import { goToTab } from '../../navigation/hooks';

const appIcon = require('../../../assets/icon.png');

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const ContractorDashboard: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    data: contractorStats = null,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['contractorStats', user?.id],
    queryFn: () => {
      if (!user) throw new Error('Not signed in');
      return UserService.getContractorStats(user.id);
    },
    enabled: !!user && user.role === 'contractor',
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotifications', user?.id],
    queryFn: () => {
      if (!user) throw new Error('Not signed in');
      return NotificationService.getUnreadCount(user.id);
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contractorStats', user?.id] });
  };

  const openJobsList = () => {
    navigation.navigate('JobsTab', { screen: 'JobsList' });
  };

  const openMeetingSchedule = () => {
    // 2026-04-30 audit: MeetingSchedule modal requires `contractorId`,
    // which a contractor's own dashboard does not have. Until a calendar
    // surface is wired in, route to the canonical Booking Status screen
    // so the contractor sees their existing/upcoming meetings.
    navigation.navigate('BusinessTab', { screen: 'BookingStatus' });
  };

  const openJobDetails = (jobId: string) => {
    navigation.navigate('JobsTab', { screen: 'JobDetails', params: { jobId } });
  };

  const userInitials =
    user?.first_name && user?.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
      : undefined;

  const businessName =
    user?.company_name ||
    (user?.first_name
      ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
      : 'Contractor');

  const menuItems: HeaderMenuItem[] = [
    {
      label: 'Browse Jobs',
      subtitle: 'Find new opportunities',
      icon: 'search',
      iconColor: me.brand,
      iconBg: me.brandSoft,
      onPress: openJobsList,
    },
    {
      label: 'Inbox',
      subtitle: 'Messages & updates',
      icon: 'mail',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      onPress: () =>
        navigation.navigate('MessagingTab', { screen: 'MessagesList' }),
    },
    {
      label: 'Quotes',
      subtitle: 'Build & send estimates',
      icon: 'document-text',
      iconColor: '#8B5CF6',
      iconBg: '#EDE9FE',
      onPress: () =>
        navigation.navigate('BusinessTab', { screen: 'QuoteBuilder' }),
    },
    {
      label: 'Invoices',
      subtitle: 'Manage billing',
      icon: 'receipt',
      iconColor: me.accent,
      iconBg: me.warnBg,
      onPress: () =>
        navigation.navigate('BusinessTab', { screen: 'InvoiceManagement' }),
    },
    {
      label: 'Expenses',
      subtitle: 'Track costs',
      icon: 'wallet',
      iconColor: me.errFg,
      iconBg: me.errBg,
      onPress: () => navigation.navigate('BusinessTab', { screen: 'Expenses' }),
    },
    {
      label: 'Calendar',
      subtitle: 'Schedule & plan',
      icon: 'calendar',
      iconColor: '#06B6D4',
      iconBg: '#CFFAFE',
      onPress: () => navigation.navigate('BusinessTab', { screen: 'Calendar' }),
    },
    {
      label: 'Profile & Settings',
      subtitle: 'Edit your account',
      icon: 'person-circle',
      iconColor: me.ink2,
      iconBg: me.bg2,
      onPress: () => goToTab(navigation, 'ProfileTab'),
    },
  ];

  const handleItemPress = (item: HeaderMenuItem) => {
    setDropdownOpen(false);
    item.onPress();
  };

  if (isLoading) {
    return <FullScreenLoading message='Loading dashboard...' />;
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <View style={[styles.errorIconWrap, { backgroundColor: me.errBg }]}>
          <Text style={styles.errorEmoji}>!</Text>
        </View>
        <Text style={styles.errorText}>Failed to load dashboard</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
          accessibilityRole='button'
          accessibilityLabel='Retry loading dashboard'
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Force translucent status bar so gradient fills behind it */}
      <StatusBar
        translucent
        backgroundColor='transparent'
        barStyle='light-content'
      />
      <ScrollView
        testID='home-scroll-view'
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleRefresh}
            tintColor={me.brand}
            colors={[me.brand]}
          />
        }
      >
        {/* Full-bleed green gradient hero — extends behind status bar */}
        <LinearGradient colors={[me.brand2, me.brand]} style={styles.hero}>
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.decorDiamond} />

          {/* Header bar: logo + bell + avatar — safe area padding applied here */}
          <View style={[styles.headerBar, { marginTop: insets.top + 8 }]}>
            <View style={styles.logoWrap}>
              <Image source={appIcon} style={styles.logoIcon} />
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() =>
                  navigation
                    .getParent?.()
                    ?.navigate('Modal', { screen: 'Notifications' })
                }
                accessibilityRole='button'
                accessibilityLabel='Notifications'
              >
                <Ionicons
                  name='notifications-outline'
                  size={22}
                  color={me.onBrand}
                />
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {userInitials && (
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={() => setDropdownOpen(true)}
                  accessibilityRole='button'
                  accessibilityLabel='Open profile menu'
                >
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Greeting + stats */}
          <Text style={styles.greeting}>{getTimeGreeting()}</Text>
          <Text style={styles.heroName} numberOfLines={1}>
            {businessName}
          </Text>
        </LinearGradient>

        {/* Stat cards overlapping hero bottom edge */}
        <View style={styles.overlappingStats}>
          <StatsSection stats={contractorStats} />
        </View>

        {/* Content below hero */}
        <View style={styles.content}>
          {/* 2026-05-21 — Mint Editorial "Next up" dark card above
              everything else, plus a warm-bids rail. Both self-hide
              when there's no data (no next appointment / no pending
              bids) so the dashboard stays calm. */}
          <FadeIn duration={400}>
            <NextUpCard
              next={
                contractorStats?.nextAppointment
                  ? {
                      jobId: contractorStats.nextAppointment.jobId,
                      type: contractorStats.nextAppointment.type,
                      client: contractorStats.nextAppointment.client,
                      location: contractorStats.nextAppointment.location,
                      time: contractorStats.nextAppointment.time,
                    }
                  : null
              }
              onOpenJob={openJobDetails}
              onMessage={(jobId) =>
                navigation.navigate('MessagingTab', {
                  screen: 'MessageThread',
                  params: { jobId },
                })
              }
            />
          </FadeIn>

          <FadeIn duration={400} delay={120}>
            <HotLeadsRail
              onOpenJob={openJobDetails}
              onSeeAll={() =>
                navigation.navigate('JobsTab', { screen: 'JobsList' })
              }
            />
          </FadeIn>

          <FadeIn duration={400}>
            <QuickActions
              onBrowseJobsPress={openJobsList}
              onInboxPress={() =>
                navigation.navigate('MessagingTab', { screen: 'MessagesList' })
              }
              onQuotesPress={() =>
                navigation.navigate('BusinessTab', { screen: 'QuoteBuilder' })
              }
              onInvoicesPress={() =>
                navigation.navigate('BusinessTab', {
                  screen: 'InvoiceManagement',
                })
              }
              onExpensesPress={() =>
                navigation.navigate('BusinessTab', { screen: 'Expenses' })
              }
              onCalendarPress={() =>
                navigation.navigate('BusinessTab', { screen: 'Calendar' })
              }
              onCRMPress={() =>
                navigation.navigate('BusinessTab', { screen: 'CRMDashboard' })
              }
              onFinancePress={() =>
                navigation.navigate('BusinessTab', {
                  screen: 'FinanceDashboard',
                })
              }
              onTimeTrackingPress={() =>
                navigation.navigate('BusinessTab', { screen: 'TimeTracking' })
              }
              onReportingPress={() =>
                navigation.navigate('BusinessTab', { screen: 'Reporting' })
              }
            />
          </FadeIn>

          {/* Phase 1.3 — Finish-setup checklist. Self-hides when done. */}
          <FadeIn duration={400} delay={200}>
            <FinishSetupCard />
          </FadeIn>

          {/* Phase 3 — earned trust-badge ladder (self-hides on probe failure). */}
          <FadeIn duration={400} delay={250}>
            <ContractorBadgesCard />
          </FadeIn>

          <SlideIn direction='up' distance={20} duration={400} delay={300}>
            <ScheduleSection
              stats={contractorStats}
              upcomingJobs={(contractorStats?.todaysJobs || []).map((job) => ({
                id: job.jobId,
                title: `${job.type} — ${job.client}`,
                time: job.time,
                status: 'Upcoming',
              }))}
              onViewAllPress={openMeetingSchedule}
              onJobDetailsPress={openJobDetails}
              onFindJobsPress={openJobsList}
            />
          </SlideIn>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Dropdown modal */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType='fade'
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        />
        <View style={[styles.dropdownCard, { top: insets.top + 62 }]}>
          <View style={styles.dropdownHeader}>
            <View style={styles.dropdownAvatar}>
              <Text style={styles.dropdownAvatarText}>
                {userInitials || '?'}
              </Text>
            </View>
            <View style={styles.dropdownUserInfo}>
              <Text style={styles.dropdownUserName} numberOfLines={1}>
                {businessName}
              </Text>
              <Text style={styles.dropdownUserRole}>Contractor</Text>
            </View>
          </View>
          <View style={styles.dropdownDivider} />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.dropdownItem,
                  index === menuItems.length - 1 && styles.dropdownItemLast,
                ]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dropdownItemIcon,
                    { backgroundColor: item.iconBg },
                  ]}
                >
                  <Ionicons name={item.icon} size={17} color={item.iconColor} />
                </View>
                <View style={styles.dropdownItemText}>
                  <Text style={styles.dropdownItemLabel}>{item.label}</Text>
                  {item.subtitle && (
                    <Text style={styles.dropdownItemSubtitle}>
                      {item.subtitle}
                    </Text>
                  )}
                </View>
                <Ionicons name='chevron-forward' size={14} color={me.ink3} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

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
import { theme, gradients, semanticBg } from '../../theme';

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
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
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
    queryFn: () => UserService.getContractorStats(user!.id),
    enabled: !!user && user.role === 'contractor',
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contractorStats', user?.id] });
  };

  const openJobsList = () => {
    navigation.navigate('JobsTab', { screen: 'JobsList' });
  };

  const openMeetingSchedule = () => {
    navigation.getParent?.()?.navigate('Modal', { screen: 'MeetingSchedule' });
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
    { label: 'Browse Jobs', subtitle: 'Find new opportunities', icon: 'search', iconColor: theme.colors.primary, iconBg: theme.colors.primaryLight, onPress: openJobsList },
    { label: 'Inbox', subtitle: 'Messages & updates', icon: 'mail', iconColor: '#3B82F6', iconBg: '#DBEAFE', onPress: () => navigation.navigate('MessagingTab', { screen: 'MessagesList' }) },
    { label: 'Quotes', subtitle: 'Build & send estimates', icon: 'document-text', iconColor: '#8B5CF6', iconBg: '#EDE9FE', onPress: () => navigation.navigate('BusinessTab', { screen: 'QuoteBuilder' }) },
    { label: 'Invoices', subtitle: 'Manage billing', icon: 'receipt', iconColor: theme.colors.accent, iconBg: theme.colors.accentLight, onPress: () => navigation.navigate('BusinessTab', { screen: 'InvoiceManagement' }) },
    { label: 'Expenses', subtitle: 'Track costs', icon: 'wallet', iconColor: theme.colors.error, iconBg: semanticBg.error, onPress: () => navigation.navigate('BusinessTab', { screen: 'Expenses' }) },
    { label: 'Calendar', subtitle: 'Schedule & plan', icon: 'calendar', iconColor: '#06B6D4', iconBg: '#CFFAFE', onPress: () => navigation.navigate('BusinessTab', { screen: 'Calendar' }) },
    { label: 'Profile & Settings', subtitle: 'Edit your account', icon: 'person-circle', iconColor: theme.colors.textSecondary, iconBg: theme.colors.backgroundSecondary, onPress: () => navigation.navigate('ProfileTab' as never) },
  ];

  const handleItemPress = (item: HeaderMenuItem) => {
    setDropdownOpen(false);
    item.onPress();
  };

  if (isLoading) {
    return <FullScreenLoading message="Loading dashboard..." />;
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <View style={[styles.errorIconWrap, { backgroundColor: semanticBg.error }]}>
          <Text style={styles.errorEmoji}>!</Text>
        </View>
        <Text style={styles.errorText}>Failed to load dashboard</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
          accessibilityRole="button"
          accessibilityLabel="Retry loading dashboard"
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
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <ScrollView
        testID="home-scroll-view"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Full-bleed green gradient hero — extends behind status bar */}
        <LinearGradient
          colors={gradients.heroGreen}
          style={styles.hero}
        >
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
                onPress={() => navigation.getParent?.()?.navigate('Modal', { screen: 'Notifications' })}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={22} color={theme.colors.textInverse} />
              </TouchableOpacity>
              {userInitials && (
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={() => setDropdownOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile menu"
                >
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Greeting + stats */}
          <Text style={styles.greeting}>{getTimeGreeting()}</Text>
          <Text style={styles.heroName} numberOfLines={1}>{businessName}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{contractorStats?.activeJobs ?? 0}</Text>
              <Text style={styles.heroStatLabel}>Active Jobs</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>£{(contractorStats?.monthlyEarnings ?? 0).toFixed(0)}</Text>
              <Text style={styles.heroStatLabel}>This Month</Text>
            </View>
          </View>

        </LinearGradient>

        {/* Stat cards overlapping hero bottom edge */}
        <View style={styles.overlappingStats}>
          <StatsSection stats={contractorStats} />
        </View>

        {/* Content below hero */}
        <View style={styles.content}>
          <FadeIn duration={400}>
            <QuickActions
              onBrowseJobsPress={openJobsList}
              onInboxPress={() => navigation.navigate('MessagingTab', { screen: 'MessagesList' })}
              onQuotesPress={() => navigation.navigate('BusinessTab', { screen: 'QuoteBuilder' })}
              onInvoicesPress={() => navigation.navigate('BusinessTab', { screen: 'InvoiceManagement' })}
              onExpensesPress={() => navigation.navigate('BusinessTab', { screen: 'Expenses' })}
              onCalendarPress={() => navigation.navigate('BusinessTab', { screen: 'Calendar' })}
              onCRMPress={() => navigation.navigate('BusinessTab', { screen: 'CRMDashboard' })}
              onFinancePress={() => navigation.navigate('BusinessTab', { screen: 'FinanceDashboard' })}
              onTimeTrackingPress={() => navigation.navigate('BusinessTab', { screen: 'TimeTracking' })}
              onReportingPress={() => navigation.navigate('BusinessTab', { screen: 'Reporting' })}
            />
          </FadeIn>

          <SlideIn direction="up" distance={20} duration={400} delay={300}>
            <ScheduleSection
              stats={contractorStats}
              upcomingJobs={
                (contractorStats?.todaysJobs || []).map((job) => ({
                  id: job.jobId,
                  title: `${job.type} — ${job.client}`,
                  time: job.time,
                  status: 'Upcoming',
                }))
              }
              onViewAllPress={openMeetingSchedule}
              onJobDetailsPress={openJobDetails}
            />
          </SlideIn>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Dropdown modal */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
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
              <Text style={styles.dropdownAvatarText}>{userInitials || '?'}</Text>
            </View>
            <View style={styles.dropdownUserInfo}>
              <Text style={styles.dropdownUserName} numberOfLines={1}>{businessName}</Text>
              <Text style={styles.dropdownUserRole}>Contractor</Text>
            </View>
          </View>
          <View style={styles.dropdownDivider} />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.dropdownItem, index === menuItems.length - 1 && styles.dropdownItemLast]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.dropdownItemIcon, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={17} color={item.iconColor} />
                </View>
                <View style={styles.dropdownItemText}>
                  <Text style={styles.dropdownItemLabel}>{item.label}</Text>
                  {item.subtitle && <Text style={styles.dropdownItemSubtitle}>{item.subtitle}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  hero: {
    paddingBottom: 56,
    paddingHorizontal: 20,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  overlappingStats: {
    marginTop: -36,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  decorCircle1: {
    position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -40, left: -20, width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  decorDiamond: {
    position: 'absolute', top: 80, right: 60, width: 60, height: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', transform: [{ rotate: '45deg' }], borderRadius: 8,
  },
  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  logoWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoIcon: { width: 28, height: 28, borderRadius: 6 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: theme.colors.textInverse, fontSize: 13, fontWeight: '700' },
  greeting: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4,
  },
  heroName: {
    fontSize: 28, fontWeight: '700', color: theme.colors.textInverse, marginBottom: 20, letterSpacing: -0.5,
  },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  heroStat: { alignItems: 'flex-start' },
  heroStatValue: { fontSize: 30, fontWeight: '700', color: theme.colors.textInverse, letterSpacing: -0.3 },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 2 },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 20 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.backgroundSecondary, padding: 40,
  },
  errorIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  errorEmoji: { fontSize: 28, fontWeight: '700', color: theme.colors.error },
  errorText: { fontSize: 16, color: theme.colors.textPrimary, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  retryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryButtonText: { color: theme.colors.textInverse, fontSize: 15, fontWeight: '600' },
  bottomSpacer: { height: 40 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  dropdownCard: {
    position: 'absolute', right: 12, width: 260, backgroundColor: theme.colors.surface, borderRadius: 12,
    overflow: 'hidden', maxHeight: 420,
    borderWidth: 1, borderColor: theme.colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  dropdownAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  dropdownAvatarText: { color: theme.colors.textInverse, fontSize: 14, fontWeight: '700' },
  dropdownUserInfo: { flex: 1 },
  dropdownUserName: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  dropdownUserRole: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  dropdownDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
    gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.borderLight,
  },
  dropdownItemLast: { borderBottomWidth: 0 },
  dropdownItemIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dropdownItemText: { flex: 1 },
  dropdownItemLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  dropdownItemSubtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
});

/**
 * ContractorDashboard Component
 *
 * Displays the contractor-specific dashboard with stats and schedule.
 * Quick actions are accessible via the profile avatar dropdown in the header.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { FadeIn, SlideIn } from '../../components/animations/primitives';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/UserService';
import { theme } from '../../theme';
import { useHaptics } from '../../utils/haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FullScreenLoading } from '../../components/LoadingSpinner';
import { NavigationHeader } from '../../components/navigation';
import type { HeaderMenuItem } from '../../components/navigation/NavigationHeader';
import { ContractorBanner } from './ContractorBanner';
import { StatsSection } from './StatsSection';
import { ScheduleSection } from './ScheduleSection';
import { QuickActions } from './QuickActions';

export const ContractorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const haptics = useHaptics();
  const queryClient = useQueryClient();

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

  const menuItems: HeaderMenuItem[] = [
    {
      label: 'Browse Jobs',
      subtitle: 'Find new opportunities',
      icon: 'search',
      iconColor: theme.colors.primary,
      iconBg: theme.colors.primaryLight,
      onPress: openJobsList,
    },
    {
      label: 'Inbox',
      subtitle: 'Messages & updates',
      icon: 'mail',
      iconColor: theme.colors.info,
      iconBg: theme.colors.accentLight,
      onPress: () => navigation.navigate('MessagingTab', { screen: 'MessagesList' }),
    },
    {
      label: 'Quotes',
      subtitle: 'Build & send estimates',
      icon: 'document-text',
      iconColor: theme.colors.info,
      iconBg: theme.colors.accentLight,
      onPress: () => navigation.navigate('ProfileTab', { screen: 'QuoteBuilder' }),
    },
    {
      label: 'Invoices',
      subtitle: 'Manage billing',
      icon: 'receipt',
      iconColor: theme.colors.warning,
      iconBg: theme.colors.accentLight,
      onPress: () => navigation.navigate('ProfileTab', { screen: 'InvoiceManagement' }),
    },
    {
      label: 'Expenses',
      subtitle: 'Track costs',
      icon: 'wallet',
      iconColor: theme.colors.error,
      iconBg: theme.colors.accentLight,
      onPress: () => navigation.navigate('ProfileTab', { screen: 'Expenses' }),
    },
    {
      label: 'Calendar',
      subtitle: 'Schedule & plan',
      icon: 'calendar',
      iconColor: theme.colors.success,
      iconBg: theme.colors.primaryLight,
      onPress: () => navigation.navigate('ProfileTab', { screen: 'Calendar' }),
    },
    {
      label: 'Profile & Settings',
      subtitle: 'Edit your account',
      icon: 'person-circle',
      iconColor: theme.colors.textSecondary,
      iconBg: theme.colors.backgroundSecondary,
      onPress: () => navigation.navigate('ProfileTab' as never),
    },
  ];

  if (isLoading) {
    return <FullScreenLoading message="Loading dashboard..." />;
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load dashboard data</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
          accessibilityRole="button"
          accessibilityLabel="Retry loading dashboard"
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
        subtitle={user?.first_name ? `Welcome back, ${user.first_name}!` : 'Contractor Dashboard'}
        onNotificationPress={() =>
          navigation.getParent?.()?.navigate('Modal', { screen: 'Notifications' })
        }
        userInitials={
          user?.first_name && user?.last_name
            ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
            : undefined
        }
        userName={user?.company_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()}
        userRole="Contractor"
        menuItems={menuItems}
      />

      <ScrollView
        testID="home-scroll-view"
        style={styles.content}
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
        <FadeIn duration={400}>
        <ContractorBanner
          user={user}
          onFindJobsPress={openJobsList}
          activeJobs={contractorStats?.activeJobs ?? 0}
          monthlyEarnings={contractorStats?.monthlyEarnings ?? 0}
        />
        </FadeIn>

        <SlideIn direction="up" distance={20} duration={400} delay={150}>
        <StatsSection stats={contractorStats} />
        </SlideIn>

        <SlideIn direction="up" distance={20} duration={400} delay={300}>
        <ScheduleSection
          stats={contractorStats}
          upcomingJobs={
            contractorStats?.nextAppointment
              ? [
                  {
                    id: contractorStats.nextAppointment.jobId,
                    title: `${contractorStats.nextAppointment.type} — ${contractorStats.nextAppointment.client}`,
                    time: contractorStats.nextAppointment.time,
                    status: 'Upcoming',
                  },
                ]
              : []
          }
          onViewAllPress={openMeetingSchedule}
          onJobDetailsPress={openJobDetails}
        />
        </SlideIn>

        <FadeIn duration={400} delay={450}>
        <QuickActions
          onBrowseJobsPress={openJobsList}
          onInboxPress={() => navigation.navigate('MessagingTab', { screen: 'MessagesList' })}
          onQuotesPress={() => navigation.navigate('ProfileTab', { screen: 'QuoteBuilder' })}
          onInvoicesPress={() => navigation.navigate('ProfileTab', { screen: 'InvoiceManagement' })}
          onExpensesPress={() => navigation.navigate('ProfileTab', { screen: 'Expenses' })}
          onCalendarPress={() => navigation.navigate('ProfileTab', { screen: 'Calendar' })}
        />
        </FadeIn>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
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
});

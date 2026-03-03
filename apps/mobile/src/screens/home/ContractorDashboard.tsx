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
import { useNavigation } from '@react-navigation/native';
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

export const ContractorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
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
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      onPress: openJobsList,
    },
    {
      label: 'Inbox',
      subtitle: 'Messages & updates',
      icon: 'mail',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      onPress: () => navigation.navigate('MessagingTab', { screen: 'MessagesList' }),
    },
    {
      label: 'Quotes',
      subtitle: 'Build & send estimates',
      icon: 'document-text',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      onPress: () => navigation.navigate('ProfileTab', { screen: 'QuoteBuilder' }),
    },
    {
      label: 'Invoices',
      subtitle: 'Manage billing',
      icon: 'receipt',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      onPress: () => navigation.navigate('ProfileTab', { screen: 'InvoiceManagement' }),
    },
    {
      label: 'Expenses',
      subtitle: 'Track costs',
      icon: 'wallet',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      onPress: () => navigation.navigate('ProfileTab', { screen: 'Expenses' }),
    },
    {
      label: 'Calendar',
      subtitle: 'Schedule & plan',
      icon: 'calendar',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      onPress: () => navigation.navigate('ProfileTab', { screen: 'Calendar' }),
    },
    {
      label: 'Profile & Settings',
      subtitle: 'Edit your account',
      icon: 'person-circle',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
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
        <ContractorBanner
          user={user}
          onFindJobsPress={openJobsList}
          activeJobs={contractorStats?.activeJobs ?? 0}
          monthlyEarnings={contractorStats?.monthlyEarnings ?? 0}
        />

        <StatsSection stats={contractorStats} />

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
    paddingHorizontal: 24,
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
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

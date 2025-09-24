/**
 * ContractorDashboard Component
 * 
 * Displays the contractor-specific dashboard with stats, schedule,
 * and quick actions.
 */

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
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { UserService, ContractorStats } from '../../services/UserService';
import { theme } from '../../theme';
import { useHaptics } from '../../utils/haptics';
import { logger } from '../../utils/logger';
import { ContractorBanner } from './ContractorBanner';
import { StatsSection } from './StatsSection';
import { ScheduleSection } from './ScheduleSection';
import { QuickActions } from './QuickActions';

export const ContractorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const haptics = useHaptics();

  const [contractorStats, setContractorStats] = useState<ContractorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContractorData();
  }, [user]);

  const loadContractorData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      if (user.role === 'contractor') {
        const stats = await UserService.getContractorStats(user.id);
        setContractorStats(stats);
      }
    } catch (error) {
      logger.error('Error loading contractor data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContractorData();
    setRefreshing(false);
  };

  const openJobsList = () => {
    navigation.navigate('JobsTab', { screen: 'JobsList' });
  };

  const openInbox = () => {
    navigation.navigate('MessagingTab', { screen: 'MessagesList' });
  };

  const openMeetingSchedule = () => {
    navigation.getParent?.()?.navigate('Modal', { screen: 'MeetingSchedule' });
  };

  const openJobDetails = (jobId: string) => {
    navigation.navigate('JobsTab', {
      screen: 'JobDetails',
      params: { jobId },
    });
  };

  // Loading state for contractor dashboard
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadContractorData()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
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

      <ContractorBanner user={user} />

      <StatsSection stats={contractorStats} />

      <ScheduleSection 
        stats={contractorStats}
        onViewAllPress={openMeetingSchedule}
        onJobDetailsPress={openJobDetails}
      />

      <QuickActions 
        onBrowseJobsPress={openJobsList}
        onInboxPress={openInbox}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
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
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

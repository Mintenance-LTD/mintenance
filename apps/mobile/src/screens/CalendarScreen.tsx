/**
 * CalendarScreen - Contractor scheduling and calendar view
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../components/shared';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../utils/mobileApiClient';

interface ScheduleItem {
  id: string;
  job_id: string;
  job_title: string;
  date: string;
  time_start: string;
  time_end?: string;
  type: 'job' | 'meeting' | 'deadline';
  status: string;
  address?: string;
}

interface AppointmentsResponse {
  appointments: Array<{
    id: string;
    jobId?: string;
    jobTitle?: string;
    title: string;
    date: string;
    time: string;
    endTime?: string;
    type?: 'job' | 'meeting' | 'deadline' | string;
    status: string;
    location?: string;
  }>;
}

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Calendar'>;
}

const ScheduleCard: React.FC<{
  item: ScheduleItem;
  onPress: () => void;
}> = ({ item, onPress }) => {
  const getTypeIcon = () => {
    switch (item.type) {
      case 'job': return 'hammer-outline' as const;
      case 'meeting': return 'people-outline' as const;
      case 'deadline': return 'alarm-outline' as const;
      default: return 'calendar-outline' as const;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'deadline': return '#222222';
      default: return '#717171';
    }
  };

  return (
    <TouchableOpacity style={styles.scheduleCard} onPress={onPress}>
      <View style={[styles.typeIndicator, { backgroundColor: getTypeColor() }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Ionicons name={getTypeIcon()} size={18} color={getTypeColor()} />
          <Text style={styles.scheduleTitle} numberOfLines={1}>{item.job_title}</Text>
        </View>
        <Text style={styles.scheduleTime}>
          {new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          {' '}{item.time_start}{item.time_end ? ` - ${item.time_end}` : ''}
        </Text>
        {item.address && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
            <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );
};

export const CalendarScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: schedule, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-schedule', user?.id],
    queryFn: async () => {
      const response = await apiClient.get<AppointmentsResponse>('/api/appointments');
      return (response.appointments || []).map((appointment) => ({
        id: appointment.id,
        job_id: appointment.jobId || appointment.id,
        job_title: appointment.jobTitle || appointment.title,
        date: appointment.date,
        time_start: appointment.time,
        time_end: appointment.endTime,
        type: (appointment.type === 'job' || appointment.type === 'meeting' || appointment.type === 'deadline')
          ? appointment.type
          : 'meeting',
        status: appointment.status,
        address: appointment.location,
      })) as ScheduleItem[];
    },
    enabled: !!user,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) return <LoadingSpinner message="Loading schedule..." />;
  if (error) return <ErrorView message="Failed to load schedule" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Calendar" showBack onBack={() => navigation.goBack()} />

      {!schedule || schedule.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No Upcoming Schedule"
          subtitle="Your jobs and meetings will appear here once scheduled."
          ctaLabel="Browse Jobs"
          onCtaPress={() => navigation.navigate('JobsList')}
        />
      ) : (
        <FlatList
          data={schedule}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ScheduleCard
              item={item}
              onPress={() => navigation.navigate('JobDetails', { jobId: item.job_id })}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor='#222222' colors={['#222222']} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    padding: theme.spacing[4],
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
    ...theme.shadows.sm,
  },
  typeIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: theme.spacing[3],
    minHeight: 48,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scheduleTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
    flex: 1,
  },
  scheduleTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginLeft: 4,
    flex: 1,
  },
});

export default CalendarScreen;


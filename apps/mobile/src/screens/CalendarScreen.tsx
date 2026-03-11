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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
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

const TYPE_STYLES: Record<string, { iconColor: string; iconBg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  job: { iconColor: '#10B981', iconBg: '#D1FAE5', icon: 'hammer-outline' },
  meeting: { iconColor: '#3B82F6', iconBg: '#DBEAFE', icon: 'people-outline' },
  deadline: { iconColor: '#EF4444', iconBg: '#FEE2E2', icon: 'alarm-outline' },
};

const ScheduleCard: React.FC<{
  item: ScheduleItem;
  onPress: () => void;
}> = ({ item, onPress }) => {
  const typeStyle = TYPE_STYLES[item.type] || { iconColor: '#717171', iconBg: '#F7F7F7', icon: 'calendar-outline' as const };

  return (
    <TouchableOpacity
      style={styles.scheduleCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.type === 'meeting' ? 'Meeting' : item.type === 'deadline' ? 'Deadline' : 'Job'}: ${item.job_title}, ${new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${item.time_start}`}
      accessibilityHint="Double tap to view details"
      activeOpacity={0.7}
    >
      <View style={[styles.typeIconWrap, { backgroundColor: typeStyle.iconBg }]}>
        <Ionicons name={typeStyle.icon} size={20} color={typeStyle.iconColor} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.scheduleTitle} numberOfLines={1}>{item.job_title}</Text>
        <Text style={styles.scheduleTime}>
          {new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          {' '}{item.time_start}{item.time_end ? ` - ${item.time_end}` : ''}
        </Text>
        {item.address && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={13} color="#B0B0B0" />
            <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={14} color="#B0B0B0" />
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
          onCtaPress={() => (navigation as any).navigate('JobsList')}
        />
      ) : (
        <FlatList
          data={schedule}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ScheduleCard
              item={item}
              onPress={() => (navigation as any).navigate('JobDetails', { jobId: item.job_id })}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#222222" colors={['#222222']} />
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
    backgroundColor: '#F7F7F7',
  },
  listContainer: {
    padding: 16,
    gap: 10,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 3,
  },
  scheduleTime: {
    fontSize: 13,
    color: '#717171',
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#B0B0B0',
    flex: 1,
  },
});

export default CalendarScreen;

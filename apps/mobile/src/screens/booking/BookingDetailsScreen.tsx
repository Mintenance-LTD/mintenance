import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { supabase } from '../../config/supabase';
import type { RootStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BookingDetails'>;
  route: RouteProp<RootStackParamList, 'BookingDetails'>;
}

export const BookingDetailsScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params;

  const {
    data: job,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['booking-details', bookingId],
    queryFn: async () => {
      // 2026-05-25 audit-43 P2: the booking list shows
      // scheduled_start_date (verified live — exists on jobs as
      // timestamp with time zone alongside scheduled_end_date), but
      // this detail screen was only fetching created_at and labelling
      // it "Booked on". After a reschedule, the list moved but the
      // detail screen kept showing the original create date. Fetch
      // both — render scheduled_start_date as "Scheduled for" and fall
      // back to created_at as "Booked on" only when no schedule exists.
      const { data: row, error: err } = await supabase
        .from('jobs')
        .select(
          'title, status, description, created_at, scheduled_start_date, scheduled_end_date'
        )
        .eq('id', bookingId)
        .single();
      if (err) throw new Error(err.message);
      return row as {
        title?: string;
        status?: string;
        description?: string;
        created_at?: string;
        scheduled_start_date?: string | null;
        scheduled_end_date?: string | null;
      } | null;
    },
    retry: 2,
  });

  if (isLoading) {
    return <LoadingSpinner message='Loading booking details...' />;
  }

  if (error || !job) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle='dark-content' backgroundColor={me.surface} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name='arrow-back' size={24} color={me.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Booking Details
          </Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.errorState}>
          <Ionicons name='alert-circle-outline' size={48} color={me.errFg} />
          <Text style={styles.errorTitle}>
            {error ? 'Failed to load booking' : 'Booking not found'}
          </Text>
          <Text style={styles.errorMessage}>
            {error instanceof Error
              ? error.message
              : 'This booking may have been removed.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            disabled={isRefetching}
            accessibilityRole='button'
          >
            <Ionicons name='refresh' size={16} color={me.onBrand} />
            <Text style={styles.retryButtonText}>
              {isRefetching ? 'Retrying...' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.surface} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {job?.title ?? 'Booking Details'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>{job?.title ?? '\u2014'}</Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Status</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {(job?.status ?? 'unknown').toUpperCase()}
            </Text>
          </View>

          {job?.description ? (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>Description</Text>
              <Text style={styles.value}>{job.description}</Text>
            </>
          ) : null}

          {job?.scheduled_start_date ? (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>
                Scheduled for
              </Text>
              <Text style={styles.value}>
                {new Date(job.scheduled_start_date).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </>
          ) : null}
          {job?.created_at ? (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>Booked on</Text>
              <Text style={styles.value}>
                {new Date(job.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  headerButton: { padding: 8, width: 40 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
    textAlign: 'center',
  },
  content: { padding: 16 },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    ...me.shadow.card,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: { fontSize: 15, color: me.ink, lineHeight: 22 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: me.ink,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: me.onBrand,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    marginTop: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: me.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: me.onBrand,
    fontSize: 14,
    fontWeight: '600',
  },
});

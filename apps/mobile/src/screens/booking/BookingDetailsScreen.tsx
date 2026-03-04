import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../theme';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { RootStackParamList } from '../../navigation/types';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BookingDetails'>;
  route: RouteProp<RootStackParamList, 'BookingDetails'>;
}

export const BookingDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params;

  const { data: job, isLoading } = useQuery({
    queryKey: ['booking-details', bookingId],
    queryFn: () => mobileApiClient.get<{ title?: string; status?: string; description?: string; created_at?: string }>(`/api/jobs/${bookingId}`),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading booking details..." />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {job?.title ?? 'Booking Details'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>{job?.title ?? '—'}</Text>

          <Text style={[styles.label, { marginTop: 16 }]}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#222222' }]}>
            <Text style={styles.statusText}>{(job?.status ?? 'unknown').toUpperCase()}</Text>
          </View>

          {job?.description ? (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>Description</Text>
              <Text style={styles.value}>{job.description}</Text>
            </>
          ) : null}

          {job?.created_at ? (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>Booked on</Text>
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
  container: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerButton: { padding: 8, width: 40 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  content: { padding: 16 },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    ...theme.shadows.base,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: { fontSize: 15, color: theme.colors.textPrimary, lineHeight: 22 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: { fontSize: 11, fontWeight: '700', color: theme.colors.textInverse },
});

export default BookingDetailsScreen;

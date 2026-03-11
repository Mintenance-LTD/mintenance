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

          <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.statusText}>{(job?.status ?? 'unknown').toUpperCase()}</Text>
          </View>

          {job?.description ? (
            <>
              <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Description</Text>
              <Text style={styles.value}>{job.description}</Text>
            </>
          ) : null}

          {job?.created_at ? (
            <>
              <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Booked on</Text>
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
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing[3],
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerButton: { padding: theme.spacing.sm, width: 40 },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  content: { padding: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[5],
    ...theme.shadows.base,
  },
  label: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  value: { fontSize: theme.typography.fontSize.base, color: theme.colors.textPrimary, lineHeight: 22 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: { fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textInverse },
});

export default BookingDetailsScreen;

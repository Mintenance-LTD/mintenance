import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { supabase } from '../../config/supabase';
import type { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BookingDetails'>;
  route: RouteProp<RootStackParamList, 'BookingDetails'>;
}

export const BookingDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params;

  const { data: job, isLoading } = useQuery({
    queryKey: ['booking-details', bookingId],
    queryFn: async () => {
      const { data: row, error: err } = await supabase
        .from('jobs')
        .select('title, status, description, created_at')
        .eq('id', bookingId)
        .single();
      if (err) throw new Error(err.message);
      return row as { title?: string; status?: string; description?: string; created_at?: string } | null;
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading booking details..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />
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
          <Text style={styles.value}>{job?.title ?? '\u2014'}</Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Status</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{(job?.status ?? 'unknown').toUpperCase()}</Text>
          </View>

          {job?.description ? (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>Description</Text>
              <Text style={styles.value}>{job.description}</Text>
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
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerButton: { padding: 8, width: 40 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  content: { padding: 16 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: { fontSize: 15, color: theme.colors.textPrimary, lineHeight: 22 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.textPrimary,
  },
  statusText: { fontSize: 11, fontWeight: '700', color: theme.colors.textInverse },
});

export default BookingDetailsScreen;

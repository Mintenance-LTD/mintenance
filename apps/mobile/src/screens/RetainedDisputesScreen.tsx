import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../components/shared';
import { mobileApiClient } from '../utils/mobileApiClient';
import type { JobsStackParamList } from '../navigation/types';
import { me } from '../design-system/mint-editorial';

const responseSchema = z.object({
  records: z
    .array(
      z.object({
        escrow_id: z.string().uuid(),
        archived_at: z.string().datetime({ offset: true }),
      })
    )
    .max(50),
  limit: z.literal(50),
});

export function RetainedDisputesScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<JobsStackParamList, 'RetainedDisputes'>;
}) {
  const { user } = useAuth();
  const { data, error, isFetching, refetch } = useQuery({
    // Shares the detail reader's sensitive-cache exclusion.
    queryKey: ['dispute-record', user?.id, 'retained-list'],
    queryFn: async ({ signal }) =>
      responseSchema.parse(
        await mobileApiClient.get<unknown>('/api/disputes/retained', { signal })
      ),
    enabled: !!user?.id,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  useFocusEffect(
    useCallback(() => {
      if (user?.id) void refetch();
    }, [user?.id, refetch])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title='Retained disputes'
        onBackPress={() => navigation.goBack()}
      />
      {!user?.id ? (
        <Text style={styles.body}>
          Please sign in to view retained disputes.
        </Text>
      ) : isFetching ? (
        <LoadingSpinner message='Loading retained disputes…' />
      ) : error ? (
        <ErrorView
          message='Unable to load retained disputes. Check your connection and access, then retry.'
          onRetry={() => {
            void refetch();
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.body}>
            Read-only records preserved after account or job deletion. Only
            records you participated in are shown, up to the latest 50. Archived
            does not mean resolved.
          </Text>
          {!data?.records.length ? (
            <Text style={styles.body}>No retained disputes found.</Text>
          ) : (
            data.records.map((record) => (
              <TouchableOpacity
                key={record.escrow_id}
                accessibilityRole='button'
                style={styles.card}
                onPress={() =>
                  navigation.navigate('DisputeDetails', {
                    escrowId: record.escrow_id,
                  })
                }
              >
                <Text style={styles.link}>
                  View dispute archived{' '}
                  {new Date(record.archived_at).toLocaleDateString('en-GB')}
                </Text>
                <Text style={styles.body}>
                  Payment reference: {record.escrow_id}
                </Text>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity
            accessibilityRole='button'
            style={styles.card}
            onPress={() => {
              void refetch();
            }}
          >
            <Text style={styles.link}>Refresh records</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },
  content: { padding: 24, gap: 16 },
  body: { color: me.ink2, fontSize: 16, lineHeight: 24 },
  card: {
    padding: 16,
    borderRadius: me.radius.card,
    backgroundColor: me.surface,
    gap: 8,
  },
  link: { color: me.brand, fontSize: 16, fontWeight: '600' },
});

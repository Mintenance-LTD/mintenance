import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../components/shared';
import type { JobsStackParamList } from '../navigation/types';
import {
  disputeStatement,
  readDispute,
  safeEvidenceUrl,
} from '../services/DisputeReader';
import { me } from '../design-system/mint-editorial';

interface Props {
  route: RouteProp<JobsStackParamList, 'DisputeDetails'>;
  navigation: NativeStackNavigationProp<JobsStackParamList, 'DisputeDetails'>;
}

export function DisputeDetailsScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const opening = useRef(false);
  const [openingEvidence, setOpeningEvidence] = useState(false);
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: [
      'dispute-record',
      user?.id,
      route.params.escrowId,
      route.params.jobId,
    ],
    queryFn: ({ signal }) => readDispute(route.params, signal),
    enabled: !!user?.id,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  const contextKey = `${user?.id}:${route.params.escrowId}:${route.params.jobId}`;
  const currentContext = useRef(contextKey);
  currentContext.current = contextKey;
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (user?.id) void refetch();
      return () => {
        focused.current = false;
      };
    }, [refetch, user?.id])
  );

  const openEvidence = async (index: number) => {
    if (opening.current || !data || !user?.id) return;
    opening.current = true;
    setOpeningEvidence(true);
    const readerContext = contextKey;
    try {
      // Refresh authorization and expiry before leaving the app. Never open the cached URL.
      const fresh = await refetch({ throwOnError: true });
      if (!focused.current || currentContext.current !== readerContext) return;
      const item = fresh.data?.dispute_evidence[index];
      const url = safeEvidenceUrl(item?.url ?? null);
      if (!url) throw new Error('Unavailable evidence');
      await Linking.openURL(url);
    } catch {
      if (focused.current && currentContext.current === readerContext)
        Alert.alert(
          'Evidence unavailable',
          'Unable to open this evidence. Please retry. If it remains unavailable, contact support.'
        );
    } finally {
      opening.current = false;
      setOpeningEvidence(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title='Dispute details'
        onBackPress={() => navigation.goBack()}
      />
      {!user?.id ? (
        <Text style={styles.body}>Please sign in to view this dispute.</Text>
      ) : isFetching ? (
        <LoadingSpinner message='Loading dispute…' />
      ) : error ? (
        <ErrorView
          message='Unable to load this dispute. Check your connection and access, then retry.'
          onRetry={() => {
            void refetch();
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!data ? (
            <Text style={styles.body}>
              No dispute record is available for this payment.
            </Text>
          ) : (
            <>
              <Text style={styles.heading}>
                {data.archived ? 'Retained dispute record' : 'Dispute record'}
              </Text>
              <Text style={styles.body}>
                Status:{' '}
                {data.archived
                  ? 'Archived'
                  : (data.dispute_record_status ?? 'Awaiting review').replace(
                      /_/g,
                      ' '
                    )}
              </Text>
              {data.archived && (
                <Text style={styles.body}>
                  This is a retained record. Archived does not mean the dispute
                  was resolved.
                </Text>
              )}
              <Text style={styles.heading}>Reason</Text>
              <Text style={styles.body}>
                {data.dispute_reason ?? 'Not recorded'}
              </Text>
              <Text style={styles.heading}>Statement</Text>
              <Text style={styles.body}>
                {disputeStatement(data.description)}
              </Text>
              <Text style={styles.heading}>Resolution</Text>
              <Text style={styles.body}>
                {data.resolution ?? 'No resolution recorded.'}
              </Text>
              <Text style={styles.heading}>Supporting evidence</Text>
              {!data.dispute_evidence.length && (
                <Text style={styles.body}>No attachments recorded.</Text>
              )}
              {data.dispute_evidence.map((item, index) =>
                safeEvidenceUrl(item.url) ? (
                  <TouchableOpacity
                    key={index}
                    style={styles.button}
                    accessibilityRole='button'
                    accessibilityLabel={`Open ${item.label}`}
                    disabled={openingEvidence}
                    accessibilityState={{ disabled: openingEvidence }}
                    onPress={() => {
                      void openEvidence(index);
                    }}
                  >
                    <Text style={styles.buttonText}>
                      {item.label} · Open attachment
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text key={index} style={styles.body}>
                    {item.label} is unavailable. Refresh to retry.
                  </Text>
                )
              )}
            </>
          )}
          <TouchableOpacity
            style={styles.button}
            accessibilityRole='button'
            onPress={() => {
              void refetch();
            }}
          >
            <Text style={styles.buttonText}>Refresh dispute</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },
  content: { padding: 24, gap: 16 },
  heading: { fontSize: 20, fontWeight: '600', color: me.ink },
  body: { fontSize: 16, lineHeight: 24, color: me.ink2 },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    padding: 14,
    backgroundColor: me.brandSoft,
    borderRadius: 12,
  },
  buttonText: { color: me.brand, fontSize: 16, fontWeight: '600' },
});

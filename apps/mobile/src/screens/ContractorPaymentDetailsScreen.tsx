import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ErrorView, LoadingSpinner, ScreenHeader } from '../components/shared';
import { useAuth } from '../contexts/AuthContext';
import { me } from '../design-system/mint-editorial';
import type { JobsStackParamList } from '../navigation/types';
import { mobileApiClient } from '../utils/mobileApiClient';

type PaymentRecord = {
  id: string;
  jobId: string;
  jobTitle: string;
  amount: number;
  contractorAmount: number | null;
  status: string;
  steps: { label: string; detail: string; at: string | null }[];
};

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});
const ukTime = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

export function ContractorPaymentDetailsScreen({
  navigation,
  route,
}: NativeStackScreenProps<JobsStackParamList, 'ContractorPaymentDetails'>) {
  const { user } = useAuth();
  const id = route.params?.escrowId;
  const payment = useQuery({
    queryKey: ['contractor-payment', user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async ({ signal }) => {
      const data = await mobileApiClient.get<PaymentRecord>(
        '/api/contractor/payments/' + encodeURIComponent(id),
        { signal }
      );
      if (data.id !== id)
        throw new Error('Payment record could not be verified');
      return data;
    },
    retry: false,
  });
  const record = user?.id ? payment.data : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title='Payment details'
        onBackPress={() => navigation.goBack()}
      />
      {payment.isFetching && !record ? (
        <LoadingSpinner message='Loading payment…' />
      ) : record ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>{record.jobTitle}</Text>
          <Text style={styles.body}>Payment reference {record.id}</Text>
          <Text style={styles.body}>
            Customer payment {gbp.format(record.amount)}
          </Text>
          {record.contractorAmount != null && (
            <Text style={styles.body}>
              Recorded contractor amount {gbp.format(record.contractorAmount)}
            </Text>
          )}
          <TouchableOpacity
            accessibilityRole='button'
            onPress={() =>
              navigation.navigate('JobDetails', { jobId: record.jobId })
            }
          >
            <Text style={styles.link}>View job</Text>
          </TouchableOpacity>
          {record.status === 'disputed' && (
            <TouchableOpacity
              accessibilityRole='button'
              onPress={() =>
                navigation.navigate('DisputeDetails', { escrowId: id })
              }
            >
              <Text style={styles.link}>View dispute</Text>
            </TouchableOpacity>
          )}
          {record.steps.map(({ label, detail, at }) => (
            <View key={label} style={styles.step}>
              <Text style={styles.heading}>{label}</Text>
              {at && (
                <Text style={styles.body}>
                  {ukTime.format(new Date(at))} UK time
                </Text>
              )}
              <Text style={styles.body}>{detail}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ErrorView
          message='Unable to load this payment. Check your access and try again.'
          onRetry={() => {
            if (id && user?.id) void payment.refetch();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },
  content: { padding: 20, gap: 12 },
  heading: { fontSize: 18, fontWeight: '600', color: me.ink },
  body: { fontSize: 14, color: me.ink2 },
  link: { fontWeight: '600', color: me.brand, paddingVertical: 8 },
  step: { padding: 16, gap: 6, borderRadius: 12, backgroundColor: me.surface },
});

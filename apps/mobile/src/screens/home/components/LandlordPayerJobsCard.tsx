/**
 * LandlordPayerJobsCard (mobile) — deferred follow-up #4 of R6 landlord story.
 *
 * Mobile counterpart of apps/web/components/landlord/LandlordPayerJobsCard.tsx.
 * Lists jobs where the signed-in user is the designated payer (not the
 * poster). Taps deep-link to the JobDetails screen where the existing
 * "Pay Now" button is gated on payer_user_id.
 *
 * Self-hides when the list is empty so non-landlord homeowners never
 * see an empty card on their dashboard.
 *
 * Direction A · Mint Editorial — token-styled.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { mobileApiClient as apiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';

interface PayerJob {
  id: string;
  title: string;
  status: string;
  budget: number | null;
  acceptedBidAmount: number | null;
  homeowner: { id: string; name: string };
  contractor: { id: string; name: string } | null;
  payerState: 'awaiting_contract' | 'awaiting_funding' | 'funded' | 'completed';
}

const STATE_LABEL: Record<PayerJob['payerState'], string> = {
  awaiting_contract: 'Contract pending',
  awaiting_funding: 'Awaiting your payment',
  funded: 'Funded · held in escrow',
  completed: 'Completed',
};

export const LandlordPayerJobsCard: React.FC = () => {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [jobs, setJobs] = useState<PayerJob[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get<{ jobs: PayerJob[] }>(
          '/api/user/jobs-as-payer'
        );
        if (!cancelled) setJobs(res.jobs || []);
      } catch {
        if (!cancelled) setJobs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (jobs === null) {
    // Loading — render a tiny placeholder to avoid layout shift but still
    // collapse to zero height once we know the list is empty.
    return (
      <View style={{ paddingVertical: 8, alignItems: 'center' }}>
        <ActivityIndicator size='small' color={me.brand} />
      </View>
    );
  }
  if (jobs.length === 0) return null;

  const awaiting = jobs.filter((j) => j.payerState === 'awaiting_funding');

  return (
    <View
      style={{
        backgroundColor: me.surface,
        borderRadius: me.radius.card,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: me.line,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
      >
        <Ionicons name='wallet-outline' size={20} color={me.accent} />
        <Text
          style={{
            marginLeft: 6,
            fontSize: 16,
            fontWeight: '700',
            color: me.ink,
          }}
        >
          Jobs posted for you
        </Text>
      </View>
      <Text
        style={{
          fontSize: 13,
          color: me.ink2,
          marginBottom: 10,
        }}
      >
        {awaiting.length > 0
          ? `${awaiting.length} job${awaiting.length === 1 ? '' : 's'} need${awaiting.length === 1 ? 's' : ''} your payment.`
          : 'All jobs up to date.'}
      </Text>

      {jobs.map((j) => {
        const amount = j.acceptedBidAmount ?? j.budget ?? null;
        const isHot = j.payerState === 'awaiting_funding';
        return (
          <TouchableOpacity
            key={j.id}
            onPress={() =>
              navigation.navigate('JobsTab', {
                screen: 'JobDetails',
                params: { jobId: j.id },
              })
            }
            style={{
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: me.line2,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: me.ink,
              }}
            >
              {j.title}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginTop: 2,
              }}
            >
              <Text style={{ fontSize: 12, color: me.ink2 }} numberOfLines={1}>
                {j.homeowner.name}
                {j.contractor ? ` · ${j.contractor.name}` : ''}
              </Text>
              {amount != null && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: me.ink,
                  }}
                >
                  £{amount.toLocaleString()}
                </Text>
              )}
            </View>
            <Text
              style={{
                marginTop: 4,
                fontSize: 11,
                color: isHot ? me.accent : me.ink3,
                fontWeight: isHot ? '700' : '500',
              }}
            >
              {STATE_LABEL[j.payerState]}
              {isHot ? ' — tap to pay' : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

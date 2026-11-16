import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { styles } from './photoReviewStyles';
interface Milestones {
  status: string;
  autoApprovalDate?: string | null;
  autoReleaseDate?: string | null;
  coolingOffEndsAt?: string | null;
  onHold?: boolean;
}
export const formatPaymentMilestone = (value: string) =>
  new Date(value).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
export function PaymentReviewMilestones({
  jobId,
  approved,
}: {
  jobId: string;
  approved: boolean;
}) {
  const [schedule, setSchedule] = useState<Milestones | null>(null),
    [state, setState] = useState('loading'),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setSchedule(null);
    setState('loading');
    mobileApiClient
      .get<{ escrow: Milestones | null }>(`/api/jobs/${jobId}/escrow`)
      .then((data) => {
        if (active) {
          setSchedule(data.escrow);
          setState('ready');
        }
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [jobId, approved, retry]);
  const dates = [
    schedule?.autoReleaseDate,
    schedule?.coolingOffEndsAt,
    !approved ? schedule?.autoApprovalDate : null,
  ].filter(
    (date): date is string => !!date && Number.isFinite(Date.parse(date))
  );
  const earliest = dates.length
    ? new Date(Math.max(...dates.map(Date.parse))).toISOString()
    : null;
  const released =
    schedule?.status === 'released' || schedule?.status === 'completed';
  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text style={styles.autoReleaseTitle}>
        Review and payment milestones · UK time
      </Text>
      {state === 'loading' && <Text>Loading recorded payment milestones…</Text>}
      {state === 'error' && (
        <TouchableOpacity
          accessibilityRole='button'
          onPress={() => setRetry((n) => n + 1)}
        >
          <Text>Payment milestones unavailable. Retry schedule</Text>
        </TouchableOpacity>
      )}
      {state === 'ready' && !schedule && (
        <Text>No payment schedule is recorded yet.</Text>
      )}
      {state === 'ready' &&
        schedule &&
        (released ? (
          <Text>
            Payment release is recorded. Bank arrival follows payment-provider
            processing.
          </Text>
        ) : (
          <>
            {!approved && schedule.autoApprovalDate && (
              <Text>
                Automatic review approval:{' '}
                {formatPaymentMilestone(schedule.autoApprovalDate)}. This is not
                a payment release date.
              </Text>
            )}
            {approved && (
              <Text>Work approved. The review deadline no longer applies.</Text>
            )}
            {schedule.coolingOffEndsAt && (
              <Text>
                Approval hold ends:{' '}
                {formatPaymentMilestone(schedule.coolingOffEndsAt)}.
              </Text>
            )}
            {earliest ? (
              <Text>
                Earliest recorded release eligibility:{' '}
                {formatPaymentMilestone(earliest)}. This is not a guaranteed
                transfer or bank-arrival time.
              </Text>
            ) : (
              <Text>A release eligibility date is not recorded yet.</Text>
            )}
            {schedule.onHold && (
              <Text>An additional payment hold requires review.</Text>
            )}
            <Text>
              Release requires approval or eligible automatic approval, the end
              of applicable holds, no unresolved dispute and final checks.
              Approving work can change the schedule.
            </Text>
          </>
        ))}
    </View>
  );
}

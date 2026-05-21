/**
 * NextUpCard — dark "what's next on your schedule" surface for the
 * contractor dashboard. Mint Editorial styling from
 * contractor-mobile-audit.html screen 01.
 *
 * Shows the imminent assigned job with a three-button row:
 *   - I'm on my way → POST /api/contractor/trips (starts the live
 *     location share + notifies the homeowner via the en-route push).
 *   - Chat → navigate to the job's messaging thread.
 *   - Call → tel: link if we have a phone number, otherwise a no-op
 *     fall-through that opens the thread instead.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { me } from '../../../design-system/mint-editorial';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { logger } from '../../../utils/logger';
import { styles } from './NextUpCard.styles';

interface NextAppointment {
  jobId: string;
  type: string;
  client: string;
  location?: string;
  time: string;
  clientPhone?: string;
  budget?: number;
}

interface Props {
  next: NextAppointment | null | undefined;
  onOpenJob: (jobId: string) => void;
  onMessage: (jobId: string) => void;
}

const formatBudget = (n?: number): string | null => {
  if (!n || n <= 0) return null;
  return `£${n.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const NextUpCard: React.FC<Props> = ({ next, onOpenJob, onMessage }) => {
  const qc = useQueryClient();
  const [tripStarted, setTripStarted] = useState(false);

  const tripMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await mobileApiClient.post('/api/contractor/trips', {
        jobId,
        tripType: 'job_visit',
      });
    },
    onSuccess: () => {
      setTripStarted(true);
      qc.invalidateQueries({ queryKey: ['contractorStats'] });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Trip start failed.';
      logger.warn('Trip start failed from NextUpCard', { error: msg });
      // 409 means "you already have an active trip" — treat as success
      // from the UX side so the button doesn't look broken.
      if (msg.toLowerCase().includes('already have an active trip')) {
        setTripStarted(true);
        return;
      }
      Alert.alert(`Couldn’t start the trip`, msg);
    },
  });

  const handleCall = useCallback(() => {
    if (!next) return;
    if (next.clientPhone) {
      Linking.openURL(`tel:${next.clientPhone}`).catch(() => {
        Alert.alert('Phone unavailable', `Couldn’t open the dialler.`);
      });
    } else {
      // No number on file — drop into the thread instead of the dialler
      // so the contractor still gets in touch with one tap.
      onMessage(next.jobId);
    }
  }, [next, onMessage]);

  if (!next) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => onOpenJob(next.jobId)}
      style={styles.card}
      accessibilityRole='button'
      accessibilityLabel={`Open ${next.type} for ${next.client} at ${next.time}`}
    >
      <View style={styles.glow} />
      <View style={styles.inner}>
        <View style={styles.eyebrowRow}>
          <View style={styles.pulse} />
          <Text style={styles.eyebrow}>Next up · {next.time}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {next.type} · {next.client}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {[next.location, formatBudget(next.budget)]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (tripStarted || tripMutation.isPending) && styles.primaryBtnDone,
            ]}
            disabled={tripStarted || tripMutation.isPending}
            onPress={(e) => {
              e.stopPropagation?.();
              if (!tripStarted) tripMutation.mutate(next.jobId);
            }}
            accessibilityRole='button'
            accessibilityLabel="I'm on my way"
          >
            {tripMutation.isPending ? (
              <ActivityIndicator color={me.onBrand} size='small' />
            ) : (
              <Text style={styles.primaryBtnText}>
                {tripStarted ? 'On the way' : 'I’m on my way'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onMessage(next.jobId);
            }}
            accessibilityRole='button'
            accessibilityLabel='Message homeowner'
          >
            <Ionicons name='chatbubble-outline' size={14} color={me.onBrand} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              handleCall();
            }}
            accessibilityRole='button'
            accessibilityLabel='Call homeowner'
          >
            <Ionicons name='call-outline' size={14} color={me.onBrand} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default NextUpCard;

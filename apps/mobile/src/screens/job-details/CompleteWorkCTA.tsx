import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { StickyBottomCTA } from '../../components/ui/StickyBottomCTA';
import { JobService } from '../../services/JobService';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { queryKeys } from '../../lib/queryClient';

export function CompleteWorkCTA({
  jobId,
  onUpload,
}: {
  jobId: string;
  onUpload: () => void;
}) {
  const qc = useQueryClient();
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const complete = async (reworkRequestId?: string) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      if (reworkRequestId) await JobService.completeJob(jobId, reworkRequestId);
      else await JobService.completeJob(jobId);
      await qc.invalidateQueries({ queryKey: queryKeys.jobs.all });
      Alert.alert(
        'Work marked complete',
        'The homeowner can now review the work and photos.'
      );
    } catch (error) {
      Alert.alert(
        'Could not complete work',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };
  const reviewCompletion = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const history = await mobileApiClient.get<{
        requests: { id: string; comments: string }[];
      }>(`/api/jobs/${jobId}/rework`);
      if (!Array.isArray(history.requests))
        throw new Error(
          'Unable to verify the current completion cycle. Please retry.'
        );
      const latest = history.requests[0];
      Alert.alert(
        latest ? 'Submit rework for review?' : 'Mark work complete?',
        latest
          ? 'Requested changes: ' +
              latest.comments +
              '\n\nAt least three new accepted after photos are required for this cycle, including the required views. Payment remains held pending review and release checks.'
          : 'Confirm that the work is finished and your after photos are uploaded. The homeowner will be asked to review it.',
        [
          { text: 'Not yet', style: 'cancel' },
          {
            text: latest ? 'Submit rework' : 'Mark complete',
            onPress: () => complete(latest?.id),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Could not check completion',
        error instanceof Error ? error.message : 'Please retry.'
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };
  return (
    <StickyBottomCTA
      buttonText='Mark work complete'
      loading={loading}
      onPress={reviewCompletion}
      secondaryAction={{ label: 'Upload after photos', onPress: onUpload }}
      secondaryText='At least three accepted after photos are required; rework needs fresh evidence.'
    />
  );
}

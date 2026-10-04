import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { StickyBottomCTA } from '../../components/ui/StickyBottomCTA';
import { JobService } from '../../services/JobService';
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
  const complete = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      await JobService.completeJob(jobId);
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
  return (
    <StickyBottomCTA
      buttonText='Mark work complete'
      loading={loading}
      onPress={() =>
        Alert.alert(
          'Mark work complete?',
          'Confirm that the work is finished and your after photos are uploaded. The homeowner will be asked to review it.',
          [
            { text: 'Not yet', style: 'cancel' },
            { text: 'Mark complete', onPress: complete },
          ]
        )
      }
      secondaryAction={{ label: 'Upload after photos', onPress: onUpload }}
      secondaryText='After photos are required before completion.'
    />
  );
}

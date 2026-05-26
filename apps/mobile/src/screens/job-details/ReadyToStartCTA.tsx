import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { StickyBottomCTA } from '../../components/ui/StickyBottomCTA';
import { JobService } from '../../services/JobService';
import { queryKeys } from '../../lib/queryClient';

/**
 * CTA for the ready_to_start sub-state where the contractor already
 * has at least one before-photo uploaded. Surfaces the same API call
 * JobPhotoUploadScreen's post-upload alert uses, so the network path
 * + idempotency guarantees are identical.
 *
 * Extracted from JobDetailsCTA.tsx 2026-05-27 (audit-76 follow-up)
 * when JobDetailsCTA crossed the 500-line MDC cap.
 */
export function ReadyToStartCTA({
  jobId,
  onStarted,
}: {
  jobId: string;
  onStarted: () => void;
}) {
  const [starting, setStarting] = useState(false);
  // audit-76: ref guard — setStarting is batched, fast double-tap fires twice.
  const startingRef = useRef(false);
  const qc = useQueryClient();

  const handleStart = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    try {
      await JobService.startJob(jobId);
      qc.invalidateQueries({ queryKey: queryKeys.jobs.details(jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
      onStarted();
      Alert.alert(
        'Job Started',
        'The homeowner has been notified that work has begun.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start job';
      Alert.alert('Could Not Start Job', msg);
    } finally {
      setStarting(false);
      startingRef.current = false;
    }
  };

  return (
    <StickyBottomCTA
      buttonText={starting ? 'Starting…' : 'Start Job'}
      onPress={handleStart}
      secondaryText='Before-photos are uploaded. Tap to begin work.'
      disabled={starting}
    />
  );
}

'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@mintenance/shared';

/**
 * 2026-05-27 audit-84 P2: hydrate the latest active contractor_locations
 * row before subscribing to realtime updates. useRealtime only delivers
 * future INSERT/UPDATE events; a homeowner opening the job page after
 * the contractor has already started sharing (or after the contractor
 * marked arrived and stopped writing) was stuck on "Waiting for
 * Contractor" until the next GPS tick — for a stationary or arrived
 * contractor that tick may never come. Mobile's HomeownerLocationRequest
 * already runs this initial read.
 *
 * Mirrors the realtime onInsert/onUpdate client-side narrowing so a
 * stale row from a re-assigned contractor can't paint the map.
 *
 * Extracted into its own hook so ContractorTravelTracking stays under
 * the 500-line MDC cap.
 */
export function useContractorLocationHydration({
  jobId,
  contractorId,
  meetingId,
  onHydrate,
}: {
  jobId: string;
  contractorId: string;
  meetingId?: string;
  onHydrate: (payload: { new: unknown | null }) => void;
}) {
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('contractor_locations')
        .select(
          'contractor_id, latitude, longitude, eta_minutes, heading, speed, location_timestamp, updated_at, context, is_active, meeting_id'
        )
        .eq('job_id', jobId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        logger.warn('contractor_locations initial read failed', {
          jobId,
          error: error.message,
        });
        return;
      }
      if (!data) return;
      if (data.contractor_id !== contractorId) return;
      if (meetingId && data.meeting_id !== meetingId) return;
      onHydrate({ new: data });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, contractorId, meetingId]);
}

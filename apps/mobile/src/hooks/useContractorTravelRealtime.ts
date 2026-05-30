/**
 * useContractorTravelRealtime
 *
 * Job-detail-path Realtime subscription for the contractor's live
 * location. Extracted from useJobTravelTracking 2026-05-28 to keep that
 * hook under the 500-line file cap. Behaviour preserved verbatim.
 *
 * 2026-05-27 audit-69 P1: the job-detail path (jobId without meetingId)
 * previously had NO Realtime subscription — the meeting branch
 * subscribes via MeetingService.subscribeToContractorTravelLocation,
 * but the job-only path relied entirely on the `onLocationUpdate`
 * callback attached at startJobTracking time. The registry singleton
 * skips startJobTracking when a watcher is already running (e.g. the
 * dashboard NextUpCard or the auto-start hook fired first), so no
 * callback was attached for the Job Detail consumer, leaving ETA
 * blank/stale even though tracking was active. Subscribing
 * independently here keeps Job Detail's currentLocation/eta state
 * honest. Single-condition filter (job_id only) for Supabase Realtime
 * parity — multi-condition AND was unreliable per audit-46 #210;
 * is_active is checked client-side.
 *
 * 2026-05-27 audit-76 follow-up: AppState-gated subscribe. Without this,
 * the Realtime channel stays open while the homeowner has the app in
 * background — drains battery on the websocket keep-alive, and on
 * foreground resume can deliver ghost ETA updates from changes that
 * happened while suspended (since RN re-delivers buffered Realtime
 * events). We subscribe only while the app is active, and re-subscribe
 * on foreground resume.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../config/supabase';
import type { TravelLocation } from './useJobTravelTracking.types';

interface UseContractorTravelRealtimeArgs {
  jobId?: string;
  meetingId?: string | null;
  /**
   * Applies an incoming Realtime location to consumer state. The caller
   * is expected to memoise this (useCallback) so the effect's
   * subscribe/unsubscribe lifecycle only churns when its own inputs do.
   */
  onLocation: (location: TravelLocation) => void;
}

export function useContractorTravelRealtime({
  jobId,
  meetingId,
  onLocation,
}: UseContractorTravelRealtimeArgs): void {
  useEffect(() => {
    if (meetingId || !jobId) return;

    type Channel = ReturnType<typeof supabase.channel>;
    let channel: Channel | null = null;

    const subscribe = () => {
      if (channel) return;
      channel = supabase
        .channel(`contractor_travel_job_${jobId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contractor_locations',
            filter: `job_id=eq.${jobId}`,
          },
          (rawPayload: unknown) => {
            const payload = rawPayload as {
              new?: {
                latitude?: number | null;
                longitude?: number | null;
                eta_minutes?: number | null;
                location_timestamp?: string | null;
                is_active?: boolean | null;
              };
            };
            const row = payload.new;
            if (!row || row.is_active === false) return;
            if (typeof row.latitude !== 'number') return;
            if (typeof row.longitude !== 'number') return;
            const etaValue = row.eta_minutes ?? 0;
            onLocation({
              latitude: row.latitude,
              longitude: row.longitude,
              eta: etaValue,
              timestamp: row.location_timestamp ?? new Date().toISOString(),
            });
          }
        )
        .subscribe();
    };

    const unsubscribe = () => {
      if (channel) {
        channel.unsubscribe();
        channel = null;
      }
    };

    // Subscribe immediately if the app is already foregrounded.
    if (AppState.currentState === 'active') {
      subscribe();
    }

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        subscribe();
      } else {
        unsubscribe();
      }
    });

    return () => {
      appStateSub.remove();
      unsubscribe();
    };
  }, [jobId, meetingId, onLocation]);
}

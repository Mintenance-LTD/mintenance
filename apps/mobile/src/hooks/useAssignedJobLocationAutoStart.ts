/**
 * Auto-start foreground live-location tracking for assigned contractors.
 *
 * The job-details location card still gives contractors explicit control,
 * but live production data showed `contractor_locations = 0`: relying on
 * contractors to open one section of one screen is too brittle. This hook
 * runs at the post-auth tab boundary, checks for an active assigned job with
 * coordinates, and starts foreground tracking only when foreground location
 * permission is already granted. It never prompts.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { JobContextLocationService } from '../services/JobContextLocationService';
import { logger } from '../utils/logger';

const ACTIVE_JOB_STATUSES = ['assigned', 'in_progress'];

interface ActiveJobRow {
  id: string;
  latitude: number | null;
  longitude: number | null;
}

export function useAssignedJobLocationAutoStart(): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;
  const serviceRef = useRef<JobContextLocationService | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!userId || userRole !== 'contractor') {
      activeJobIdRef.current = null;
      void serviceRef.current?.stopJobTracking();
      serviceRef.current = null;
      return;
    }

    let cancelled = false;

    const tryStart = async (trigger: 'mount' | 'foreground') => {
      if (cancelled || inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== 'granted') return;

        const { data, error } = await supabase
          .from('jobs')
          .select('id, latitude, longitude')
          .eq('contractor_id', userId)
          .in('status', ACTIVE_JOB_STATUSES)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (error) {
          logger.warn('assigned-job location auto-start query failed', {
            error: error.message,
            trigger,
          });
          return;
        }

        const job = (data?.[0] ?? null) as ActiveJobRow | null;
        if (!job || job.latitude == null || job.longitude == null) return;
        if (activeJobIdRef.current === job.id) return;

        if (serviceRef.current) {
          await serviceRef.current.stopJobTracking();
        }

        const service = new JobContextLocationService();
        await service.startJobTracking(
          userId,
          job.id,
          null,
          { latitude: job.latitude, longitude: job.longitude }
        );

        serviceRef.current = service;
        activeJobIdRef.current = job.id;
        logger.info('Assigned job location auto-started', {
          jobId: job.id,
          trigger,
        });
      } catch (err) {
        logger.warn('assigned-job location auto-start failed', {
          error: err instanceof Error ? err.message : String(err),
          trigger,
        });
      } finally {
        inFlightRef.current = false;
      }
    };

    const timer = setTimeout(() => {
      void tryStart('mount');
    }, 2000);

    const handleAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') {
        void tryStart('foreground');
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.remove();
      void serviceRef.current?.stopJobTracking();
      serviceRef.current = null;
      activeJobIdRef.current = null;
    };
  }, [userId, userRole]);
}

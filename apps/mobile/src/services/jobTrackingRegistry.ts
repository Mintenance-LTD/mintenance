/**
 * Refcounted singleton registry for JobContextLocationService, scoped by
 * (contractorId, jobId). Extracted from JobContextLocationService
 * 2026-05-28 to keep that file under the 500-line cap.
 *
 * 2026-05-26 audit-50 P1: Both useAssignedJobLocationAutoStart and
 * useJobTravelTracking previously `new`'d their own service for the same
 * job — stopJobTracking on either set is_active=false on the shared row
 * mid-journey, flickering the homeowner map. acquire bumps the count,
 * release decrements; stop only fires when count hits 0.
 */
import { logger } from '../utils/logger';
import { JobContextLocationService } from './JobContextLocationService';

const trackingRegistry = new Map<
  string,
  { service: JobContextLocationService; refCount: number }
>();

const makeKey = (contractorId: string, jobId: string) =>
  `${contractorId}|${jobId}`;

export function acquireJobTrackingService(
  contractorId: string,
  jobId: string
): JobContextLocationService {
  const key = makeKey(contractorId, jobId);
  let entry = trackingRegistry.get(key);
  if (!entry) {
    entry = { service: new JobContextLocationService(), refCount: 0 };
    trackingRegistry.set(key, entry);
  }
  entry.refCount += 1;
  return entry.service;
}

export async function releaseJobTrackingService(
  contractorId: string,
  jobId: string
): Promise<void> {
  const key = makeKey(contractorId, jobId);
  const entry = trackingRegistry.get(key);
  if (!entry) return;
  entry.refCount = Math.max(0, entry.refCount - 1);
  if (entry.refCount === 0) {
    trackingRegistry.delete(key);
    try {
      await entry.service.stopJobTracking();
    } catch (err) {
      logger.warn('releaseJobTrackingService: stop threw', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
